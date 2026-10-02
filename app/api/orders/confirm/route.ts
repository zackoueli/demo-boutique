import { NextRequest, NextResponse, after } from "next/server";
import Stripe from "stripe";
import { checkRateLimit, getClientIp } from "@/lib/api-helpers";
import { finalizeOrder, runPostOrderTasks, toPublicOrder } from "@/lib/orders-server";

// Appelé par le navigateur juste après le paiement : enregistre la commande
// (si le webhook Stripe ne l'a pas déjà fait) et renvoie son récapitulatif.
export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(`confirm:${getClientIp(req)}`, 20).allowed) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const { paymentIntentId } = await req.json();
    if (typeof paymentIntentId !== "string" || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) {
      return NextResponse.json({ error: "Paiement invalide" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Paiement non finalisé", status: pi.status }, { status: 409 });
    }

    const result = await finalizeOrder(pi);
    if (!result) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (result.created) {
      after(() => runPostOrderTasks(result.docId, result.order));
    }

    return NextResponse.json({ order: toPublicOrder(result.order) });
  } catch (err) {
    console.error("[orders/confirm]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
