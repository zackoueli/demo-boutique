import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp, isValidEmail } from "@/lib/api-helpers";
import { cartIdForEmail } from "@/lib/orders-server";
import { sanitizeCartLines } from "@/lib/carts-server";

// Enregistre le panier d'un visiteur qui a coché « Me rappeler mon panier par email ».
// Sans cet accord (consent: false), le panier éventuellement enregistré est supprimé.
export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(`cart:${getClientIp(req)}`, 20).allowed) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const { email, consent, items } = await req.json();
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "Email invalide" }, { status: 400 });
    }

    const db = getAdminDb();
    const cartId = cartIdForEmail(email);
    const cartRef = db.collection("carts").doc(cartId);

    if (consent !== true) {
      await cartRef.delete();
      return NextResponse.json({ ok: true });
    }

    // Une désinscription reste définitive, même si l'adresse est ressaisie plus tard
    const optOut = await db.collection("emailOptOuts").doc(cartId).get();
    if (optOut.exists) return NextResponse.json({ ok: true });

    const lines = sanitizeCartLines(items);
    if (lines.length === 0) {
      await cartRef.delete();
      return NextResponse.json({ ok: true });
    }

    const existing = await cartRef.get();
    await cartRef.set({
      email: email.trim().toLowerCase(),
      items: lines,
      token: existing.data()?.token ?? randomBytes(16).toString("hex"),
      // Étape de relance déjà envoyée : 0 = aucune. Le compteur repart à chaque modification du panier.
      stage: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cart/save]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
