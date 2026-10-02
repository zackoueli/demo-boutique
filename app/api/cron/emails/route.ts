import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { isValidEmail } from "@/lib/api-helpers";
import { resolveCartLines, type SavedCartLine } from "@/lib/carts-server";
import { sendCartReminder, sendReviewRequest } from "@/lib/followup-emails";

export const maxDuration = 60;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Délai minimal depuis la dernière modification du panier avant chaque relance */
const CART_REMINDER_DELAYS = [1 * HOUR, 24 * HOUR, 72 * HOUR];
/** Délai entre la livraison et la demande d'avis */
const REVIEW_REQUEST_DELAY = 7 * DAY;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("authorization") ?? "";
  try {
    return timingSafeEqual(Buffer.from(`Bearer ${secret}`), Buffer.from(provided));
  } catch {
    return false;
  }
}

function millis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

// Tâche planifiée (vercel.json). Chaque envoi dépend du temps écoulé, pas de la fréquence
// d'appel : la route peut tourner une fois par jour comme une fois par heure.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Date.now();
  const report = { cartReminders: 0, reviewRequests: 0, cleaned: 0, errors: 0 };

  /* ─── Relances de panier ─── */
  try {
    const carts = await db.collection("carts").where("stage", "<", CART_REMINDER_DELAYS.length).limit(200).get();
    for (const doc of carts.docs) {
      try {
        const cart = doc.data();
        const stage = Number(cart.stage) || 0;
        const updatedAt = millis(cart.updatedAt);
        if (updatedAt === null || now - updatedAt < CART_REMINDER_DELAYS[stage]) continue;

        const items = await resolveCartLines((cart.items ?? []) as SavedCartLine[]);
        if (items.length === 0 || !isValidEmail(cart.email)) {
          await doc.ref.delete();
          continue;
        }

        const sent = await sendCartReminder((stage + 1) as 1 | 2 | 3, {
          email: cart.email,
          cartId: doc.id,
          token: cart.token,
          items,
        });
        if (sent) {
          await doc.ref.update({ stage: stage + 1, lastEmailAt: FieldValue.serverTimestamp() });
          report.cartReminders++;
        }
      } catch (err) {
        report.errors++;
        console.error(`[cron/emails] Relance panier ${doc.id}:`, err);
      }
    }
  } catch (err) {
    report.errors++;
    console.error("[cron/emails] Lecture des paniers:", err);
  }

  /* ─── Demandes d'avis après livraison ─── */
  try {
    const orders = await db.collection("orders")
      .where("status", "==", "delivered")
      .where("reviewRequestSent", "==", false)
      .limit(100)
      .get();
    for (const doc of orders.docs) {
      try {
        const order = doc.data();
        const deliveredAt = millis(order.deliveredAt);
        if (deliveredAt === null || now - deliveredAt < REVIEW_REQUEST_DELAY) continue;
        if (!isValidEmail(order.userEmail) || !order.reviewToken || !(order.items ?? []).length) {
          await doc.ref.update({ reviewRequestSent: true });
          continue;
        }

        // Conseils d'entretien relus sur les fiches produit
        const items = await Promise.all(
          (order.items as { productId: string; name: string; imageUrl?: string; quantity: number; price: number }[]).map(async (item) => {
            const product = await db.collection("products").doc(item.productId).get();
            return { ...item, careInstructions: product.data()?.careInstructions as string | undefined };
          })
        );

        const sent = await sendReviewRequest({
          email: order.userEmail,
          fullName: order.shipping?.fullName ?? "",
          orderId: order.id,
          reviewToken: order.reviewToken,
          items,
        });
        if (sent) {
          await doc.ref.update({ reviewRequestSent: true, reviewRequestSentAt: FieldValue.serverTimestamp() });
          report.reviewRequests++;
        }
      } catch (err) {
        report.errors++;
        console.error(`[cron/emails] Demande d'avis ${doc.id}:`, err);
      }
    }
  } catch (err) {
    report.errors++;
    console.error("[cron/emails] Lecture des commandes:", err);
  }

  /* ─── Ménage : paniers anciens et paiements jamais terminés (données personnelles) ─── */
  try {
    const [oldCarts, oldSessions] = await Promise.all([
      db.collection("carts").where("updatedAt", "<", Timestamp.fromMillis(now - 30 * DAY)).limit(200).get(),
      db.collection("checkoutSessions").where("createdAt", "<", Timestamp.fromMillis(now - 7 * DAY)).limit(200).get(),
    ]);
    await Promise.all([...oldCarts.docs, ...oldSessions.docs].map((d) => d.ref.delete()));
    report.cleaned = oldCarts.size + oldSessions.size;
  } catch (err) {
    report.errors++;
    console.error("[cron/emails] Ménage:", err);
  }

  return NextResponse.json(report);
}
