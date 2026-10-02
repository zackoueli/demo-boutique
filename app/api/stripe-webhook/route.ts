import { NextRequest, NextResponse, after } from "next/server";
import Stripe from "stripe";
import { finalizeOrder, runPostOrderTasks } from "@/lib/orders-server";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature invalide:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;

    try {
      // Filet de sécurité : la commande est enregistrée même si le navigateur
      // du client s'est fermé avant d'appeler /api/orders/confirm.
      const result = await finalizeOrder(pi);
      if (result?.created) {
        console.log(`[webhook] Commande enregistrée via webhook: ${result.docId}`);
        after(() => runPostOrderTasks(result.docId, result.order));
      }
    } catch (err) {
      console.error("[webhook] Erreur sauvegarde commande:", err);
      return NextResponse.json({ error: "Erreur" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
