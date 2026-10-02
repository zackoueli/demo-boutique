import type Stripe from "stripe";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHash, randomBytes } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendOrderConfirmation } from "@/lib/order-emails";
import { createShipmentAtMondialRelay } from "@/lib/mondial-relay";
import type { RelayPoint } from "@/lib/types";

/* ─── Session de paiement : panier vérifié côté serveur, en attente du paiement ───
   Écrite par /api/create-payment-intent, transformée en commande par finalizeOrder. */

export interface CheckoutItem {
  cartItemId: string;
  productId: string;
  name: string;
  price: number;
  basePrice: number;
  imageUrl: string;
  quantity: number;
  customization?: Record<string, string>;
  customizationLabels?: Record<string, string>;
  customizationExtra?: number;
}

export interface CheckoutShipping {
  type: "home" | "relay";
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  carrier?: string;
  relayPoint?: RelayPoint;
}

export interface CheckoutSession {
  orderId: string;
  paymentIntentId: string;
  userId: string | null;
  userEmail: string;
  items: CheckoutItem[];
  shipping: CheckoutShipping;
  subtotal: number;
  discount: number;
  promoCode: string | null;
  promoId: string | null;
  shippingCost: number;
  total: number;
  weightGrams: number;
}

type OrderData = FirebaseFirestore.DocumentData;

export interface FinalizeResult {
  docId: string;
  order: OrderData;
  /** true si cet appel a créé la commande (email et expédition restent à lancer) */
  created: boolean;
}

/** Identifiant du panier sauvegardé d'une adresse email */
export function cartIdForEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 40);
}

/**
 * Transforme un paiement réussi en commande. Idempotent : appelé à la fois par le
 * navigateur (/api/orders/confirm) et par le webhook Stripe, une seule commande est créée.
 */
export async function finalizeOrder(pi: Stripe.PaymentIntent): Promise<FinalizeResult | null> {
  if (pi.status !== "succeeded") return null;
  const orderId = pi.metadata?.orderId;
  if (!orderId) return null;

  const db = getAdminDb();

  // Commandes créées avant le passage à la création côté serveur (identifiant de document aléatoire)
  const legacy = await db.collection("orders").where("id", "==", orderId).limit(1).get();
  if (!legacy.empty) {
    return { docId: legacy.docs[0].id, order: legacy.docs[0].data(), created: false };
  }

  const orderRef = db.collection("orders").doc(orderId);
  const sessionRef = db.collection("checkoutSessions").doc(orderId);

  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.get(orderRef);
    if (existing.exists) return null;

    const sessionSnap = await tx.get(sessionRef);
    const session = sessionSnap.exists ? (sessionSnap.data() as CheckoutSession) : null;

    // Session absente ou liée à un autre paiement : on garde au moins une trace depuis Stripe
    if (!session || session.paymentIntentId !== pi.id) {
      const meta = pi.metadata;
      const data = {
        id: orderId,
        userId: null,
        userEmail: meta.email ?? "",
        status: "pending",
        items: [],
        shipping: {
          type: meta.deliveryType === "relay" ? "relay" : "home",
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
      };
      tx.set(orderRef, data);
      return data;
    }

    // Toutes les lectures avant les écritures (contrainte des transactions Firestore)
    const quantities = new Map<string, number>();
    for (const item of session.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    const productRefs = [...quantities.keys()].map((id) => db.collection("products").doc(id));
    const productSnaps = productRefs.length ? await tx.getAll(...productRefs) : [];
    const promoRef = session.promoId ? db.collection("promoCodes").doc(session.promoId) : null;
    const promoSnap = promoRef ? await tx.get(promoRef) : null;

    const isRelay = session.shipping.type === "relay";
    const data = {
      id: orderId,
      userId: session.userId,
      userEmail: session.userEmail,
      status: "pending",
      items: session.items,
      shipping: isRelay ? { ...session.shipping, mondialRelay: { status: "pending" } } : session.shipping,
      payment: { method: "card", stripePaymentIntentId: pi.id },
      subtotal: session.subtotal,
      discount: session.discount,
      promoCode: session.promoCode,
      shippingCost: session.shippingCost,
      total: session.total,
      weightGrams: session.weightGrams,
      reviewToken: randomBytes(16).toString("hex"),
      reviewRequestSent: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    for (const snap of productSnaps) {
      if (!snap.exists) continue;
      const stock = (snap.data()?.stock ?? 0) as number;
      tx.update(snap.ref, { stock: Math.max(0, stock - (quantities.get(snap.id) ?? 0)) });
    }
    if (promoRef && promoSnap?.exists) {
      tx.update(promoRef, { usageCount: FieldValue.increment(1) });
    }
    tx.delete(sessionRef);
    tx.set(orderRef, data);
    return data;
  });

  if (!created) {
    const snap = await orderRef.get();
    return { docId: orderId, order: snap.data() ?? {}, created: false };
  }
  return { docId: orderId, order: created, created: true };
}

/** À lancer une seule fois, par l'appel qui a créé la commande : email, expédition, panier sauvegardé. */
export async function runPostOrderTasks(docId: string, order: OrderData): Promise<void> {
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(docId);

  if (order.userEmail) {
    try {
      const result = await sendOrderConfirmation({
        orderId: order.id,
        userEmail: order.userEmail,
        items: order.items ?? [],
        shipping: order.shipping,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost ?? 0,
        discount: order.discount,
        promoCode: order.promoCode,
        total: order.total,
      });
      if (result.ok && !result.skipped) await orderRef.update({ confirmationEmailSent: true });
      if (!result.ok) console.error(`[orders] Email de confirmation non envoyé pour ${docId}:`, result.error);
    } catch (err) {
      console.error(`[orders] Email de confirmation en échec pour ${docId}:`, err);
    }

    // La commande est passée : plus de relance de panier pour cette adresse
    await db.collection("carts").doc(cartIdForEmail(order.userEmail)).delete().catch(() => {});
  }

  const shipping = order.shipping as CheckoutShipping | undefined;
  if (shipping?.type === "relay" && shipping.relayPoint?.id) {
    try {
      const shipment = await createShipmentAtMondialRelay({
        orderId: docId,
        weightGrams: Number(order.weightGrams) || 500,
        relayPointId: shipping.relayPoint.id,
        recipient: {
          fullName: shipping.fullName ?? "",
          address: shipping.address ?? "",
          city: shipping.city ?? "",
          postalCode: shipping.postalCode ?? "",
          country: "FR",
        },
      });
      await orderRef.update({
        "shipping.mondialRelay": {
          status: "created",
          expeditionNumber: shipment.expeditionNumber,
          labelUrl: shipment.labelUrl,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error(`[orders] Échec création expédition Mondial Relay pour ${docId}:`, message);
      await orderRef.update({ "shipping.mondialRelay": { status: "failed", error: message } }).catch(() => {});
    }
  }
}

/** Ce que le navigateur a le droit de voir d'une commande (page de confirmation) */
export function toPublicOrder(order: OrderData) {
  const createdAt = order.createdAt instanceof Timestamp ? order.createdAt.seconds : Math.floor(Date.now() / 1000);
  const shipping = (order.shipping ?? {}) as CheckoutShipping;
  return {
    id: order.id as string,
    userId: (order.userId ?? null) as string | null,
    userEmail: order.userEmail as string,
    status: order.status as string,
    items: (order.items ?? []) as CheckoutItem[],
    shipping: {
      type: shipping.type,
      fullName: shipping.fullName,
      address: shipping.address,
      city: shipping.city,
      postalCode: shipping.postalCode,
      country: shipping.country,
      carrier: shipping.carrier,
      relayPoint: shipping.relayPoint,
    },
    payment: { method: (order.payment?.method ?? "card") as string },
    subtotal: (order.subtotal ?? order.total) as number,
    discount: (order.discount ?? 0) as number,
    promoCode: (order.promoCode ?? null) as string | null,
    shippingCost: (order.shippingCost ?? 0) as number,
    total: order.total as number,
    createdAt: { seconds: createdAt },
  };
}
