import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

/* ─── Constantes livraison (miroir de checkout/page.tsx) ─── */
const FREE_SHIPPING_THRESHOLD = 8000;
const CARRIERS: Record<string, number> = {
  "mondial-relay": 450,
  "colissimo": 599,
  "dpd-home": 499,
};

/* ─── Helpers options personnalisation ─── */
function optionExtra(opt: string): number {
  const parts = opt.split(":");
  if (parts.length < 2) return 0;
  return Math.round(parseFloat(parts[1].trim()) * 100) || 0;
}

function optionLabel(opt: string): string {
  return opt.split(":")[0].trim();
}

interface CustomizationField {
  id: string;
  type: "text" | "select" | "color";
  options?: string[];
  extraPrice?: number;
  required: boolean;
}

function calcExtra(fields: CustomizationField[], customization: Record<string, string>): number {
  let extra = 0;
  for (const field of fields) {
    const val = customization[field.id];
    if (!val) continue;
    if (field.type === "text") {
      extra += field.extraPrice ?? 0;
    } else {
      const matched = field.options?.find((o) => optionLabel(o) === val);
      if (matched) extra += optionExtra(matched);
    }
  }
  return extra;
}

interface CartItemPayload {
  productId: string;
  quantity: number;
  customization?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const {
      orderId,
      email,
      fullName,
      deliveryType,
      carrierId,
      promoCode,
      items,
      ...rest
    }: {
      orderId: string;
      email: string;
      fullName: string;
      deliveryType: "home" | "relay" | "pickup";
      carrierId?: string;
      promoCode?: string;
      items: CartItemPayload[];
      [key: string]: unknown;
    } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    const db = getAdminDb();

    /* ─── Recalcul des prix depuis Firestore ─── */
    let subtotal = 0;
    const verifiedItems: string[] = [];

    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return NextResponse.json({ error: "Données article invalides" }, { status: 400 });
      }

      const snap = await db.collection("products").doc(item.productId).get();
      if (!snap.exists) {
        return NextResponse.json({ error: `Produit introuvable : ${item.productId}` }, { status: 400 });
      }

      const product = snap.data() as {
        price: number;
        name: string;
        stock: number;
        customizationFields?: CustomizationField[];
      };

      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Stock insuffisant pour : ${product.name}` }, { status: 400 });
      }

      const extra = product.customizationFields && item.customization
        ? calcExtra(product.customizationFields, item.customization)
        : 0;

      const unitPrice = product.price + extra;
      subtotal += unitPrice * item.quantity;
      verifiedItems.push(`${product.name} x${item.quantity}`);
    }

    /* ─── Code promo ─── */
    let discount = 0;
    if (promoCode) {
      const promoSnap = await db
        .collection("promoCodes")
        .where("code", "==", promoCode.toUpperCase().trim())
        .where("active", "==", true)
        .limit(1)
        .get();

      if (!promoSnap.empty) {
        const promo = promoSnap.docs[0].data() as {
          type: "percent" | "fixed";
          value: number;
          minOrder: number;
        };
        if (!promo.minOrder || subtotal >= promo.minOrder) {
          discount = promo.type === "percent"
            ? Math.round(subtotal * promo.value / 100)
            : Math.min(subtotal, promo.value);
        }
      }
    }

    const afterDiscount = Math.max(0, subtotal - discount);

    /* ─── Frais de livraison ─── */
    let shippingCost = 0;
    if (deliveryType === "relay") {
      shippingCost = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : (CARRIERS[carrierId ?? "mondial-relay"] ?? 450);
    } else if (deliveryType === "home") {
      shippingCost = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : (CARRIERS[carrierId ?? "colissimo"] ?? 599);
    }

    const finalTotal = afterDiscount + shippingCost;
    const chargeAmount = Math.max(finalTotal, 50);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: chargeAmount,
      currency: "eur",
      receipt_email: email ?? undefined,
      metadata: {
        orderId: orderId ?? "",
        email: email ?? "",
        fullName: fullName ?? "",
        deliveryType: deliveryType ?? "",
        items: verifiedItems.join(", ").slice(0, 500),
        ...Object.fromEntries(
          Object.entries(rest).map(([k, v]) => [k, String(v ?? "").slice(0, 500)])
        ),
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      verifiedAmount: chargeAmount,
    });
  } catch (err) {
    console.error("[stripe] create-payment-intent:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
