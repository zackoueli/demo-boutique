import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp } from "@/lib/api-helpers";

/* Avis déposés depuis l'email envoyé après livraison : le lien porte un jeton propre
   à la commande, ce qui permet de donner son avis sans créer de compte. */

interface OrderItem {
  productId: string;
  name: string;
  imageUrl?: string;
}

const ORDER_ID_REGEX = /^CMD-\d{4}-[A-Z0-9]{4,12}$/;

async function loadOrder(orderId: unknown, token: unknown) {
  if (typeof orderId !== "string" || !ORDER_ID_REGEX.test(orderId) || typeof token !== "string" || !token) return null;
  const snap = await getAdminDb().collection("orders").doc(orderId).get();
  const order = snap.data();
  if (!order?.reviewToken) return null;
  try {
    if (!timingSafeEqual(Buffer.from(order.reviewToken), Buffer.from(token))) return null;
  } catch {
    return null;
  }
  return order;
}

function reviewId(orderId: string, productId: string) {
  return `${orderId}_${productId}`;
}

/** « Marie Dupont » → « Marie D. » */
function publicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export async function GET(req: NextRequest) {
  try {
    if (!checkRateLimit(`reviews:${getClientIp(req)}`, 30).allowed) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const orderId = req.nextUrl.searchParams.get("order");
    const order = await loadOrder(orderId, req.nextUrl.searchParams.get("t"));
    if (!order) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });

    const db = getAdminDb();
    const seen = new Set<string>();
    const items = await Promise.all(
      ((order.items ?? []) as OrderItem[])
        .filter((item) => !seen.has(item.productId) && seen.add(item.productId))
        .map(async (item) => ({
          productId: item.productId,
          name: item.name,
          imageUrl: item.imageUrl ?? "",
          reviewed: (await db.collection("reviews").doc(reviewId(order.id, item.productId)).get()).exists,
        }))
    );

    return NextResponse.json({ firstName: publicName(order.shipping?.fullName ?? "").split(" ")[0], items });
  } catch (err) {
    console.error("[reviews] GET", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(`reviews:${getClientIp(req)}`, 30).allowed) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const { order: orderId, t, productId, rating, comment } = await req.json();
    const order = await loadOrder(orderId, t);
    if (!order) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });

    const item = ((order.items ?? []) as OrderItem[]).find((i) => i.productId === productId);
    if (!item) return NextResponse.json({ error: "Produit absent de cette commande." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Note invalide." }, { status: 400 });
    }
    const text = typeof comment === "string" ? comment.trim().slice(0, 1500) : "";
    if (!text) return NextResponse.json({ error: "Merci d'écrire quelques mots." }, { status: 400 });

    // Un avis par produit et par commande : un second envoi remplace le premier
    await getAdminDb().collection("reviews").doc(reviewId(order.id, item.productId)).set({
      productId: item.productId,
      orderId: order.id,
      userId: order.userId ?? `guest:${order.id}`,
      userName: publicName(order.shipping?.fullName ?? ""),
      rating,
      comment: text,
      verified: true,
      featured: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reviews] POST", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
