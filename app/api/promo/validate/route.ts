import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp } from "@/lib/api-helpers";

// Vérification d'un code promo sans compte client (la collection promoCodes
// n'est lisible que par les utilisateurs connectés).
export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(`promo:${getClientIp(req)}`).allowed) {
      return NextResponse.json({ error: "Trop de tentatives, réessayez dans une minute." }, { status: 429 });
    }

    const { code, subtotal } = await req.json();
    if (typeof code !== "string" || !code.trim() || code.length > 40) {
      return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 400 });
    }

    const snap = await getAdminDb()
      .collection("promoCodes")
      .where("code", "==", code.toUpperCase().trim())
      .where("active", "==", true)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 404 });
    }

    const promo = snap.docs[0].data() as { code: string; type: "percent" | "fixed"; value: number; minOrder?: number };
    const minOrder = promo.minOrder ?? 0;
    if (minOrder > 0 && (typeof subtotal !== "number" || subtotal < minOrder)) {
      return NextResponse.json({ error: `Commande minimum de ${(minOrder / 100).toFixed(0)} € requise.` }, { status: 400 });
    }

    return NextResponse.json({ id: snap.docs[0].id, code: promo.code, type: promo.type, value: promo.value, minOrder });
  } catch (err) {
    console.error("[promo/validate]", err);
    return NextResponse.json({ error: "Erreur lors de la vérification." }, { status: 500 });
  }
}
