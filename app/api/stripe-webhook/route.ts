import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

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
    const meta = pi.metadata;
    const orderId = meta.orderId;

    if (!orderId) return NextResponse.json({ ok: true });

    try {
      const db = getAdminDb();
      const existing = await db.collection("orders").where("id", "==", orderId).get();

      // Commande déjà sauvegardée par confirmOrder — rien à faire
      if (!existing.empty) return NextResponse.json({ ok: true });

      // Commande manquante — on la crée depuis les métadonnées Stripe
      await db.collection("orders").add({
        id: orderId,
        userId: null,
        userEmail: meta.email ?? "",
        status: "pending",
        items: [],
        shipping: {
          type: meta.deliveryType ?? "relay",
          fullName: meta.fullName ?? "",
          address: meta.relayAddress ?? meta.address ?? "",
          city: meta.relayCity ?? meta.city ?? "",
          postalCode: meta.relayPostal ?? meta.postal ?? "",
          country: "France",
          ...(meta.relayName ? { relayPoint: { name: meta.relayName } } : {}),
          carrier: meta.carrier ?? "",
        },
        payment: { method: "card", stripePaymentIntentId: pi.id },
        subtotal: pi.amount,
        shippingCost: 0,
        total: pi.amount,
        recoveredByWebhook: true,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`[webhook] Commande récupérée via webhook: ${orderId}`);

      // Envoie email de confirmation si on a l'email
      if (meta.email) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            userEmail: meta.email,
            items: [],
            shipping: { fullName: meta.fullName ?? "", type: meta.deliveryType ?? "relay" },
            total: pi.amount,
            subtotal: pi.amount,
            shippingCost: 0,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[webhook] Erreur sauvegarde commande:", err);
      return NextResponse.json({ error: "Erreur" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
