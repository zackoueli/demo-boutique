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
      if (!existing.empty) {
        await maybeCreateMondialRelayShipment(db, existing.docs[0].id, existing.docs[0].data(), meta);
        return NextResponse.json({ ok: true });
      }

      // Commande manquante — on la crée depuis les métadonnées Stripe
      const newOrderRef = await db.collection("orders").add({
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
          ...(meta.relayName ? { relayPoint: { id: meta.relayId ?? "", name: meta.relayName } } : {}),
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

      const newOrderSnap = await newOrderRef.get();
      await maybeCreateMondialRelayShipment(db, newOrderRef.id, newOrderSnap.data(), meta);

      // Envoie email de confirmation si on a l'email
      if (meta.email) {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/send-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
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

interface OrderShippingData {
  type?: string;
  fullName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  relayPoint?: { id?: string };
  mondialRelay?: { status?: string };
}

async function maybeCreateMondialRelayShipment(
  db: FirebaseFirestore.Firestore,
  docId: string,
  orderData: FirebaseFirestore.DocumentData | undefined,
  meta: Record<string, string>
) {
  const shipping = orderData?.shipping as OrderShippingData | undefined;
  if (!shipping || shipping.type !== "relay") return;

  // Déjà traité (créé ou tenté) — on ne réessaie pas automatiquement.
  if (shipping.mondialRelay?.status) return;

  const relayId = shipping.relayPoint?.id || meta.relayId;
  if (!relayId) {
    console.error(`[webhook] Pas d'ID point relais pour la commande ${docId}, création MR impossible`);
    return;
  }

  const weightGrams = Number(meta.weightGrams) || 500;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/mondial-relay/create-shipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: docId,
        weightGrams,
        relayPointId: relayId,
        recipient: {
          fullName: shipping.fullName ?? "",
          address: shipping.address ?? "",
          city: shipping.city ?? "",
          postalCode: shipping.postalCode ?? "",
          country: "FR",
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      await db.collection("orders").doc(docId).update({
        "shipping.mondialRelay": { status: "failed", error: data.error ?? "Erreur inconnue" },
      });
      console.error(`[webhook] Échec création expédition Mondial Relay pour ${docId}:`, data.error);
      return;
    }

    await db.collection("orders").doc(docId).update({
      "shipping.mondialRelay": {
        status: "created",
        expeditionNumber: data.expeditionNumber,
        labelUrl: data.labelUrl,
      },
    });
    console.log(`[webhook] Expédition Mondial Relay créée pour ${docId}: ${data.expeditionNumber}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    await db.collection("orders").doc(docId).update({
      "shipping.mondialRelay": { status: "failed", error: message },
    }).catch(() => {});
    console.error(`[webhook] Erreur appel création expédition Mondial Relay pour ${docId}:`, message);
  }
}
