import type { MetadataRoute } from "next";

const BASE_URL = "https://www.histoire-eternelle-l-atelier.fr";
const PROJECT_ID = "fir-boutique-754bb";

type FirestoreDoc = {
  document?: {
    name?: string;
    fields?: {
      slug?: { stringValue?: string };
      key?: { stringValue?: string };
      updatedAt?: { timestampValue?: string };
      createdAt?: { timestampValue?: string };
    };
    updateTime?: string;
  };
};

async function fetchCollection(collectionId: string): Promise<FirestoreDoc[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: { from: [{ collectionId }] },
      }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as FirestoreDoc[];
    return Array.isArray(data) ? data.filter((d) => d.document) : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Pages statiques indexables
  const staticPaths: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/catalogue", changeFrequency: "weekly", priority: 0.9 },
    { path: "/a-propos", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
    { path: "/cgv", changeFrequency: "yearly", priority: 0.2 },
    { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.2 },
    { path: "/confidentialite", changeFrequency: "yearly", priority: 0.2 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const [products, categories] = await Promise.all([
    fetchCollection("products"),
    fetchCollection("categories"),
  ]);

  const productEntries: MetadataRoute.Sitemap = products
    .map((d) => {
      const slug = d.document?.fields?.slug?.stringValue;
      if (!slug) return null;
      const lastModified =
        d.document?.fields?.updatedAt?.timestampValue ??
        d.document?.updateTime ??
        d.document?.fields?.createdAt?.timestampValue ??
        now;
      return {
        url: `${BASE_URL}/produits/${slug}`,
        lastModified: new Date(lastModified),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const categoryEntries: MetadataRoute.Sitemap = categories
    .map((d) => {
      const key = d.document?.fields?.key?.stringValue;
      if (!key) return null;
      const lastModified = d.document?.updateTime ?? now;
      return [
        {
          url: `${BASE_URL}/catalogue/${key}`,
          lastModified: new Date(lastModified),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
        {
          url: `${BASE_URL}/univers/${key}`,
          lastModified: new Date(lastModified),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        },
      ];
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .flat();

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
