import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp } from "@/lib/api-helpers";
import { resolveCartLines, type SavedCartLine } from "@/lib/carts-server";

// Lien « Retrouver mon panier » des emails de relance : renvoie le panier enregistré.
export async function GET(req: NextRequest) {
  try {
    if (!checkRateLimit(`cart-restore:${getClientIp(req)}`, 20).allowed) {
      return NextResponse.json({ items: [] }, { status: 429 });
    }

    const id = req.nextUrl.searchParams.get("id") ?? "";
    const token = req.nextUrl.searchParams.get("t") ?? "";
    if (!/^[a-f0-9]{40}$/.test(id) || !token) {
      return NextResponse.json({ items: [] }, { status: 400 });
    }

    const snap = await getAdminDb().collection("carts").doc(id).get();
    if (!snap.exists || snap.data()?.token !== token) {
      return NextResponse.json({ items: [] }, { status: 404 });
    }

    const items = await resolveCartLines((snap.data()?.items ?? []) as SavedCartLine[]);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[cart/restore]", err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
