import { queryCollection } from "@/lib/firestore-rest";
import type { Product } from "@/lib/types";

/**
 * Tous les produits, du plus récent au plus ancien, pour le rendu serveur du catalogue.
 * Renvoie null si Firestore est injoignable : le catalogue retombe alors sur le chargement navigateur.
 */
export async function getAllProducts(): Promise<Product[] | null> {
  try {
    const docs = await queryCollection("products", {
      orderBy: { field: "createdAt", direction: "DESCENDING" },
      revalidate: 60,
    });
    return docs.map((doc) => ({ id: doc.id, ...doc.data }) as unknown as Product);
  } catch (err) {
    console.error("Catalogue serveur :", err);
    return null;
  }
}
