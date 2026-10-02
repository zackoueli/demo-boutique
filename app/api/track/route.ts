import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit, getClientIp } from "@/lib/api-helpers";
import { normalizeText } from "@/lib/search";

const FUNNEL_STEPS = ["visit", "view_item", "add_to_cart", "begin_checkout", "purchase"];

/** Date du jour à Paris, au format AAAA-MM-JJ */
function today(): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

// Compteurs anonymes du tunnel de vente et journal des recherches.
// Aucune donnée personnelle n'est stockée : un total par jour et par étape.
export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(`track:${getClientIp(req)}`, 60).allowed) {
      return new NextResponse(null, { status: 429 });
    }

    const { event, q, results } = await req.json();
    const db = getAdminDb();

    if (FUNNEL_STEPS.includes(event)) {
      const day = today();
      await db.collection("analyticsDaily").doc(day).set({ date: day, [event]: FieldValue.increment(1) }, { merge: true });
    } else if (event === "search" && typeof q === "string") {
      const query = normalizeText(q).slice(0, 60);
      if (query) {
        const id = createHash("sha1").update(query).digest("hex").slice(0, 32);
        await db.collection("searchLogs").doc(id).set({
          query,
          count: FieldValue.increment(1),
          results: Number.isInteger(results) ? results : 0,
          lastAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } else {
      return new NextResponse(null, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[track]", err);
    return new NextResponse(null, { status: 500 });
  }
}
