import { queryCollection } from "@/lib/firestore-rest";
import { getAllProducts } from "@/lib/products-server";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/* Flux produit Google Merchant Center (RSS 2.0, espace de noms g:).
   Merchant Center le relit chaque jour : prix, stock et photos restent alignés sur Firestore.
   Les frais de port et les retours sont réglés dans Merchant Center, pas ici. */

// Catégorie Google « Vêtements et accessoires > Bijoux », réservée aux catégories de la boutique qui sont des bijoux.
// Pour les autres (objets déco, porte-clefs), Google choisit lui-même la catégorie.
const GOOGLE_JEWELRY_CATEGORY = "188";
const JEWELRY_CATEGORIES = new Set(["bijoux-memoriels", "bijoux-fantaisie", "medailles-animaux"]);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: string | undefined): string {
  return value ? `<${name}>${escapeXml(value)}</${name}>` : "";
}

type CategoryDoc = { key?: string; label?: string; subCategories?: { key?: string; label?: string }[] };

/** Libellés des catégories et sous-catégories, indexés par clé (« cendres » → « Cendres ») */
async function getCategoryLabels(): Promise<Map<string, string>> {
  // Les libellés ne servent qu'au classement interne : sans eux, on garde la clé
  const docs = await queryCollection("categories", { revalidate: 3600 }).catch(() => []);
  const labels = new Map<string, string>();
  for (const { data } of docs) {
    const cat = data as CategoryDoc;
    if (cat.key && cat.label) labels.set(cat.key, cat.label);
    for (const sub of cat.subCategories ?? []) {
      if (sub.key && sub.label) labels.set(`${cat.key}/${sub.key}`, sub.label);
    }
  }
  return labels;
}

export async function GET() {
  const [products, categoryLabels] = await Promise.all([getAllProducts(), getCategoryLabels()]);

  // Firestore injoignable : mieux vaut une erreur (Merchant Center réessaie) qu'un flux vide qui retirerait tout le catalogue
  if (!products) {
    return new Response("Catalogue momentanément indisponible", { status: 503 });
  }

  const items = products
    .filter((p) => p.slug && p.name && p.price > 0 && (p.images?.length || p.imageUrl))
    .map((p) => {
      const images = p.images?.length ? p.images : [p.imageUrl];
      const description = p.description?.trim() || `${p.name}, création artisanale façonnée à la main par ${SITE_NAME}.`;
      const productType = [
        categoryLabels.get(p.category) ?? p.category,
        p.subCategory && (categoryLabels.get(`${p.category}/${p.subCategory}`) ?? p.subCategory),
      ].filter(Boolean).join(" > ");

      return [
        "<item>",
        tag("g:id", p.id),
        tag("g:title", p.name.slice(0, 150)),
        tag("g:description", description.slice(0, 5000)),
        tag("g:link", `${SITE_URL}/produits/${p.slug}`),
        tag("g:image_link", images[0]),
        ...images.slice(1, 11).map((url) => tag("g:additional_image_link", url)),
        // Même règle que les données structurées de la fiche produit
        tag("g:availability", p.stock > 0 ? "in_stock" : "out_of_stock"),
        tag("g:price", `${(p.price / 100).toFixed(2)} EUR`),
        tag("g:condition", "new"),
        tag("g:brand", SITE_NAME),
        // Créations artisanales : pas de code-barres (GTIN) ni de référence fabricant
        tag("g:identifier_exists", "no"),
        JEWELRY_CATEGORIES.has(p.category) ? tag("g:google_product_category", GOOGLE_JEWELRY_CATEGORY) : "",
        tag("g:product_type", productType),
        "</item>",
      ].join("");
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${escapeXml(SITE_NAME)}</title>
<link>${SITE_URL}</link>
<description>${escapeXml(`Catalogue ${SITE_NAME}`)}</description>
${items.join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
