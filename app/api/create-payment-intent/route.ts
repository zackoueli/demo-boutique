import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, getRequestUid } from "@/lib/firebase-admin";
import { isValidEmail } from "@/lib/api-helpers";
import { calcExtra, optionLabel } from "@/lib/customization";
import { computeShippingCost, findCarrier, type DeliveryType } from "@/lib/shipping";
import type { CheckoutItem, CheckoutSession, CheckoutShipping } from "@/lib/orders-server";
import type { CustomizationField, RelayPoint } from "@/lib/types";

const ORDER_ID_REGEX = /^CMD-\d{4}-[A-Z0-9]{4,12}$/;
const DELIVERY_TYPES: DeliveryType[] = ["home", "relay", "pickup"];

interface CartItemPayload {
  cartItemId?: string;
  productId: string;
  quantity: number;
  customization?: Record<string, string>;
}

interface Payload {
  orderId: string;
  email: string;
  fullName: string;
  deliveryType: DeliveryType;
  carrierId?: string;
  promoCode?: string;
  items: CartItemPayload[];
  relayPoint?: RelayPoint;
  address?: string;
  city?: string;
  postal?: string;
}

function clean(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const body: Payload = await req.json();
    const { orderId, deliveryType, carrierId, promoCode, items } = body;
    const email = clean(body.email, 254);
    const fullName = clean(body.fullName);

    if (typeof orderId !== "string" || !ORDER_ID_REGEX.test(orderId)) return badRequest("Référence de commande invalide");
    if (!isValidEmail(email)) return badRequest("Adresse email invalide");
    if (!fullName) return badRequest("Nom manquant");
    if (!DELIVERY_TYPES.includes(deliveryType)) return badRequest("Mode de livraison invalide");
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) return badRequest("Panier vide");

    const db = getAdminDb();

    const existingOrder = await db.collection("orders").doc(orderId).get();
    if (existingOrder.exists) {
      return NextResponse.json({ error: "Cette commande a déjà été payée." }, { status: 409 });
    }

    /* ─── Recalcul des prix depuis Firestore ─── */
    let subtotal = 0;
    const verifiedItems: CheckoutItem[] = [];
    const requested = new Map<string, number>();

    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return badRequest("Données article invalides");
      }

      const snap = await db.collection("products").doc(item.productId).get();
      if (!snap.exists) return badRequest("Un article de votre panier n'existe plus.");

      const product = snap.data() as {
        price: number;
        name: string;
        stock: number;
        imageUrl?: string;
        customizationFields?: CustomizationField[];
      };

      // Le stock se vérifie sur le cumul : un même produit peut figurer plusieurs fois (personnalisations différentes)
      const total = (requested.get(item.productId) ?? 0) + item.quantity;
      requested.set(item.productId, total);
      if (product.stock < total) return badRequest(`Stock insuffisant pour : ${product.name}`);

      const fields = product.customizationFields ?? [];
      const customization: Record<string, string> = {};
      const customizationLabels: Record<string, string> = {};
      for (const field of fields) {
        const value = clean(item.customization?.[field.id]);
        if (!value) {
          if (field.required) return badRequest(`Personnalisation manquante pour ${product.name} : ${field.label}`);
          continue;
        }
        if (field.type !== "text" && !field.options?.some((o) => optionLabel(o) === value)) {
          return badRequest(`Option indisponible pour ${product.name} : ${field.label}`);
        }
        customization[field.id] = value;
        customizationLabels[field.label] = value;
      }

      const extra = calcExtra(fields, customization);
      const unitPrice = product.price + extra;
      subtotal += unitPrice * item.quantity;

      verifiedItems.push({
        cartItemId: clean(item.cartItemId) || item.productId,
        productId: item.productId,
        name: product.name,
        price: unitPrice,
        basePrice: product.price,
        imageUrl: product.imageUrl ?? "",
        quantity: item.quantity,
        ...(Object.keys(customization).length > 0 ? { customization, customizationLabels } : {}),
        ...(extra > 0 ? { customizationExtra: extra } : {}),
      });
    }

    /* ─── Code promo ─── */
    let discount = 0;
    let appliedPromo: { id: string; code: string } | null = null;
    if (promoCode) {
      const promoSnap = await db
        .collection("promoCodes")
        .where("code", "==", promoCode.toUpperCase().trim())
        .where("active", "==", true)
        .limit(1)
        .get();

      if (!promoSnap.empty) {
        const promo = promoSnap.docs[0].data() as {
          code: string;
          type: "percent" | "fixed";
          value: number;
          minOrder: number;
        };
        if (!promo.minOrder || subtotal >= promo.minOrder) {
          discount = promo.type === "percent"
            ? Math.round(subtotal * promo.value / 100)
            : Math.min(subtotal, promo.value);
          appliedPromo = { id: promoSnap.docs[0].id, code: promo.code };
        }
      }
    }

    const afterDiscount = Math.max(0, subtotal - discount);

    /* ─── Livraison ─── */
    const carrier = findCarrier(deliveryType, carrierId);
    const shippingCost = computeShippingCost(deliveryType, carrierId, afterDiscount);

    let shipping: CheckoutShipping;
    if (deliveryType === "relay") {
      const relay = body.relayPoint;
      const relayId = clean(relay?.id, 20);
      if (!relay || !relayId) return badRequest("Veuillez sélectionner un point relais.");
      shipping = {
        type: "relay",
        fullName,
        address: clean(relay.address),
        city: clean(relay.city),
        postalCode: clean(relay.postalCode, 10),
        country: "France",
        carrier: carrier?.name ?? "",
        relayPoint: {
          id: relayId,
          name: clean(relay.name),
          address: clean(relay.address),
          city: clean(relay.city),
          postalCode: clean(relay.postalCode, 10),
          ...(relay.hours ? { hours: clean(relay.hours, 300) } : {}),
        },
      };
    } else if (deliveryType === "pickup") {
      shipping = {
        type: "home",
        fullName,
        address: "En main propre",
        city: "",
        postalCode: "",
        country: "France",
        carrier: "En main propre",
      };
    } else {
      const address = clean(body.address);
      const city = clean(body.city);
      const postalCode = clean(body.postal, 10);
      if (!address || !city || !/^\d{5}$/.test(postalCode)) return badRequest("Adresse de livraison incomplète");
      shipping = {
        type: "home",
        fullName,
        address,
        city,
        postalCode,
        country: "France",
        carrier: carrier?.name ?? "",
      };
    }

    const finalTotal = afterDiscount + shippingCost;
    const chargeAmount = Math.max(finalTotal, 50);
    const weightGrams = verifiedItems.reduce((sum, i) => sum + i.quantity, 0) * 200;

    // Compte client : le jeton est vérifié, l'identifiant n'est jamais pris tel quel du navigateur
    const userId = await getRequestUid(req);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
      currency: "eur",
      receipt_email: email,
      metadata: {
        orderId,
        email,
        fullName,
        deliveryType,
        carrier: shipping.carrier ?? "",
        weightGrams: String(weightGrams),
        items: verifiedItems.map((i) => `${i.name} x${i.quantity}`).join(", ").slice(0, 500),
        ...(shipping.relayPoint
          ? {
              relayId: shipping.relayPoint.id,
              relayName: shipping.relayPoint.name,
              relayAddress: shipping.address,
              relayCity: shipping.city,
              relayPostal: shipping.postalCode,
            }
          : { address: shipping.address, city: shipping.city, postal: shipping.postalCode }),
      },
      automatic_payment_methods: { enabled: true },
    });

    const session: CheckoutSession = {
      orderId,
      paymentIntentId: paymentIntent.id,
      userId,
      userEmail: email,
      items: verifiedItems,
      shipping,
      subtotal,
      discount,
      promoCode: appliedPromo?.code ?? null,
      promoId: appliedPromo?.id ?? null,
      shippingCost,
      total: chargeAmount,
      weightGrams,
    };
    await db.collection("checkoutSessions").doc(orderId).set({ ...session, createdAt: FieldValue.serverTimestamp() });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      verifiedAmount: chargeAmount,
      subtotal,
      discount,
      shippingCost,
    });
  } catch (err) {
    console.error("[stripe] create-payment-intent:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
