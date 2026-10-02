"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

type Step = "visit" | "view_item" | "add_to_cart" | "begin_checkout" | "purchase";

interface SearchRow {
  query: string;
  count: number;
  results: number;
}

interface Stats {
  days: number;
  funnel: Record<Step, number>;
  searchesWithoutResult: SearchRow[];
  topSearches: SearchRow[];
}

const STEPS: { key: Step; label: string; hint: string }[] = [
  { key: "visit", label: "Visite", hint: "Sessions arrivées sur le site" },
  { key: "view_item", label: "Fiche produit", hint: "Ont regardé au moins un produit" },
  { key: "add_to_cart", label: "Panier", hint: "Ont ajouté au panier" },
  { key: "begin_checkout", label: "Paiement", hint: "Ont ouvert la page de commande" },
  { key: "purchase", label: "Achat", hint: "Ont payé" },
];

const PERIODS = [7, 30, 90];

function percent(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0).replace(".", ",")} %`;
}

export default function AdminStatistiquesPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [result, setResult] = useState<{ days: number; stats: Stats | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    user.getIdToken()
      .then((token) => fetch(`/api/admin/stats?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }))
      .then((res) => (res.ok ? res.json() : null))
      .then((stats) => { if (active) setResult({ days, stats }); })
      .catch(() => { if (active) setResult({ days, stats: null }); });
    return () => { active = false; };
  }, [user, days]);

  const loading = result?.days !== days;
  const stats = loading ? null : result?.stats ?? null;
  const visits = stats?.funnel.visit ?? 0;

  // Étape où l'on perd la plus grande part des visiteurs restants
  const worstDrop = stats
    ? STEPS.slice(1).reduce<{ label: string; from: string; lost: number } | null>((worst, step, i) => {
        const previous = stats.funnel[STEPS[i].key];
        if (previous === 0) return worst;
        const lost = 1 - stats.funnel[step.key] / previous;
        return !worst || lost > worst.lost ? { label: step.label, from: STEPS[i].label, lost } : worst;
      }, null)
    : null;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Mesure</p>
          <h1 className="font-serif text-2xl font-semibold text-brown">Tunnel de vente</h1>
        </div>
        <div className="flex gap-1 bg-sand rounded-xl p-1" role="group" aria-label="Période">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${days === p ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"}`}
            >
              {p} jours
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-parchment rounded-xl animate-pulse" />)}
        </div>
      ) : !stats ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          Impossible de charger les statistiques.
        </p>
      ) : (
        <>
          <div className="bg-sand border border-border rounded-2xl p-6">
            {visits === 0 ? (
              <p className="text-sm text-brown-light">
                Aucune visite mesurée sur cette période. Les compteurs démarrent à la mise en ligne de cette version.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-[7.5rem_1fr_auto] sm:grid-cols-[9rem_1fr_auto] gap-x-4 gap-y-4 items-center">
                  {STEPS.map((step, i) => {
                    const value = stats.funnel[step.key];
                    const previous = i === 0 ? value : stats.funnel[STEPS[i - 1].key];
                    return (
                      <div key={step.key} className="contents" title={`${step.hint} : ${value}`}>
                        <div>
                          <p className="text-sm font-medium text-brown">{step.label}</p>
                          <p className="text-xs text-brown-light">
                            {i === 0 ? "100 %" : `${percent(value, previous)} de l'étape précédente`}
                          </p>
                        </div>
                        <div className="h-3 bg-parchment rounded-full overflow-hidden">
                          <div
                            className="h-full bg-terracotta rounded-full"
                            style={{ width: `${Math.max(value > 0 ? 1 : 0, (value / visits) * 100)}%` }}
                          />
                        </div>
                        <p className="text-sm font-semibold text-brown tabular-nums text-right">{value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border mt-6 pt-5 grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-brown-light uppercase tracking-widest mb-1">Taux de conversion</p>
                    <p className="font-serif text-2xl font-semibold text-brown">{percent(stats.funnel.purchase, visits)}</p>
                    <p className="text-xs text-brown-light mt-0.5">des visites se terminent par un achat (repère courant : 2 à 3 %)</p>
                  </div>
                  {worstDrop && (
                    <div>
                      <p className="text-xs text-brown-light uppercase tracking-widest mb-1">Étape à travailler en priorité</p>
                      <p className="font-serif text-2xl font-semibold text-brown">{worstDrop.from} → {worstDrop.label}</p>
                      <p className="text-xs text-brown-light mt-0.5">
                        {percent(worstDrop.lost, 1)} des personnes s&apos;arrêtent ici
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-brown-light mt-3">
            Chaque étape est comptée une fois par session de navigation, sans cookie ni donnée personnelle. Vos visites dans l&apos;admin ne sont pas comptées.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <SearchTable
              title="Recherches sans résultat"
              hint="Des produits à renommer, ou à créer."
              rows={stats.searchesWithoutResult}
              empty="Aucune recherche sans résultat."
            />
            <SearchTable
              title="Recherches les plus fréquentes"
              hint="Les mots que vos clientes utilisent."
              rows={stats.topSearches}
              empty="Aucune recherche enregistrée."
              showResults
            />
          </div>
        </>
      )}
    </div>
  );
}

function SearchTable({ title, hint, rows, empty, showResults }: {
  title: string; hint: string; rows: SearchRow[]; empty: string; showResults?: boolean;
}) {
  return (
    <div className="bg-sand border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-serif font-semibold text-brown">{title}</h2>
        <p className="text-xs text-brown-light mt-0.5">{hint}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-brown-light">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-brown-light uppercase bg-parchment/50">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Recherche</th>
              {showResults && <th className="px-3 py-2 text-right font-medium">Résultats</th>}
              <th className="px-5 py-2 text-right font-medium">Fois</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.query}>
                <td className="px-5 py-2.5 text-brown">{row.query}</td>
                {showResults && <td className="px-3 py-2.5 text-right text-brown-light tabular-nums">{row.results}</td>}
                <td className="px-5 py-2.5 text-right font-medium text-brown-mid tabular-nums">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
