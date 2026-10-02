import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isAdminRequest } from "@/lib/firebase-admin";

const FUNNEL_STEPS = ["visit", "view_item", "add_to_cart", "begin_checkout", "purchase"] as const;

function dayString(date: Date): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(date);
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
    const start = dayString(new Date(Date.now() - (days - 1) * 86_400_000));
    const db = getAdminDb();

    const [dailySnap, searchSnap] = await Promise.all([
      db.collection("analyticsDaily").where("date", ">=", start).get(),
      db.collection("searchLogs").orderBy("count", "desc").limit(300).get(),
    ]);

    const funnel = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, 0])) as Record<(typeof FUNNEL_STEPS)[number], number>;
    dailySnap.docs.forEach((d) => {
      const data = d.data();
      FUNNEL_STEPS.forEach((s) => { funnel[s] += Number(data[s]) || 0; });
    });

    const searches = searchSnap.docs.map((d) => {
      const data = d.data();
      return { query: data.query as string, count: Number(data.count) || 0, results: Number(data.results) || 0 };
    });

    return NextResponse.json({
      days,
      funnel,
      searchesWithoutResult: searches.filter((s) => s.results === 0).slice(0, 20),
      topSearches: searches.filter((s) => s.results > 0).slice(0, 20),
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
