/* Mesure du tunnel de vente.
   - Compteurs anonymes maison (/api/track) : une étape comptée une fois par session,
     sans cookie ni identifiant, consultables dans l'admin.
   - Google Analytics 4 en complément, uniquement s'il est configuré et accepté (cf. ui/analytics.tsx). */

export type FunnelStep = "visit" | "view_item" | "add_to_cart" | "begin_checkout" | "purchase";

export interface TrackedItem {
  id: string;
  name: string;
  price: number; // centimes
  quantity: number;
}

interface TrackParams {
  value?: number; // centimes
  items?: TrackedItem[];
  orderId?: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

/** true la première fois qu'une clé est vue dans la session de navigation */
function firstTime(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {}
  return true;
}

export function track(step: FunnelStep, params: TrackParams = {}) {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return;

  const key = step === "purchase" && params.orderId ? `ft_purchase_${params.orderId}` : `ft_${step}`;
  const first = firstTime(key);
  if (first) send({ event: step });
  // Un achat peut être signalé par le checkout puis par la page de confirmation : une seule fois suffit
  if (step === "purchase" && !first) return;

  // "visit" correspond au page_view que GA4 envoie déjà seul
  if (step !== "visit" && window.gtag) {
    window.gtag("event", step, {
      currency: "EUR",
      ...(params.value !== undefined ? { value: params.value / 100 } : {}),
      ...(params.orderId ? { transaction_id: params.orderId } : {}),
      ...(params.items
        ? { items: params.items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price / 100, quantity: i.quantity })) }
        : {}),
    });
  }
}

export function trackSearch(query: string, results: number) {
  if (typeof window === "undefined") return;
  const q = query.trim().toLowerCase();
  if (!q || !firstTime(`ft_search_${q}`)) return;
  send({ event: "search", q, results });
  window.gtag?.("event", "search", { search_term: q });
}
