import HomeClient from "./home-client";
import { queryCollection } from "@/lib/firestore-rest";
import type { Category } from "@/lib/categories";
import type { Product } from "@/lib/types";

// Catégories et coups de cœur sont lus côté serveur : le titre, les collections et
// l'image principale sont dans le HTML initial, sans attendre le JavaScript.
// Si Firestore est injoignable lors d'une régénération, l'erreur remonte et la
// dernière version valide de la page reste servie.
export default async function HomePage() {
  const [categoryDocs, featuredDocs] = await Promise.all([
    queryCollection("categories", { orderBy: { field: "order" }, revalidate: 300 }),
    queryCollection("products", { where: ["featured", true], limit: 20, revalidate: 300 }),
  ]);

  const categories = categoryDocs.map((d) => ({ id: d.id, ...d.data })) as unknown as Category[];
  const featured = featuredDocs.map((d) => ({ id: d.id, ...d.data })) as unknown as Product[];

  return <HomeClient initialCategories={categories} initialFeatured={featured} />;
}
