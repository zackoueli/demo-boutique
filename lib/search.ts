import type { Product } from "./types";

/** Minuscules, sans accents ni ponctuation : "Mémoriel" → "memoriel" */
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Distance d'édition (deux lettres inversées comptent pour une faute), abandonnée dès qu'elle dépasse `max` */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let beforePrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], beforePrev[j - 2] + 1);
      }
    }
    beforePrev = prev;
    prev = curr;
  }
  return prev[b.length];
}

/** Nombre de fautes de frappe tolérées selon la longueur du mot */
function tolerance(word: string): number {
  if (word.length <= 3) return 0;
  return word.length <= 7 ? 1 : 2;
}

/** Score d'un mot de la recherche face à un texte : 3 mot exact, 2 contenu dans le texte, 1 approchant, 0 absent */
function scoreToken(token: string, text: string, words: string[]): number {
  if (words.includes(token)) return 3;
  if (text.includes(token)) return 2;
  const max = tolerance(token);
  if (max === 0) return 0;
  // Comparaison au mot entier et à son début, pour tolérer une faute dans une saisie partielle
  return words.some((w) => editDistance(token, w, max) <= max || editDistance(token, w.slice(0, token.length), max) <= max) ? 1 : 0;
}

/**
 * Recherche insensible aux accents et tolérante aux fautes de frappe.
 * Tous les mots saisis doivent correspondre ; le nom du produit pèse plus que le reste.
 */
export function searchProducts(products: Product[], query: string, categoryLabels: Record<string, string> = {}): Product[] {
  const tokens = normalizeText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];

  const scored: { product: Product; score: number }[] = [];
  for (const product of products) {
    const name = normalizeText(product.name ?? "");
    const rest = normalizeText(
      [product.description, product.materials, product.category, categoryLabels[product.category], product.subCategory]
        .filter(Boolean)
        .join(" ")
    );
    const nameWords = name.split(" ");
    const restWords = rest.split(" ");

    let score = 0;
    let matchesAll = true;
    for (const token of tokens) {
      const best = Math.max(scoreToken(token, name, nameWords) * 2, scoreToken(token, rest, restWords));
      if (best === 0) { matchesAll = false; break; }
      score += best;
    }
    if (matchesAll) scored.push({ product, score });
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.product);
}
