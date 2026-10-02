import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Rating {
  average: number;
  count: number;
}

type RatingMap = Record<string, Rating>;

// Les avis sont chargés une seule fois par visite, puis partagés par toutes les vignettes
let cache: Promise<RatingMap> | null = null;

function loadRatings(): Promise<RatingMap> {
  if (!cache) {
    cache = getDocs(collection(db, "reviews"))
      .then((snap) => {
        const sums: Record<string, { total: number; count: number }> = {};
        snap.docs.forEach((d) => {
          const { productId, rating } = d.data() as { productId?: string; rating?: number };
          if (!productId || typeof rating !== "number") return;
          const entry = (sums[productId] ??= { total: 0, count: 0 });
          entry.total += rating;
          entry.count += 1;
        });
        return Object.fromEntries(
          Object.entries(sums).map(([id, s]) => [id, { average: s.total / s.count, count: s.count }])
        );
      })
      .catch(() => {
        cache = null;
        return {};
      });
  }
  return cache;
}

/** À appeler après l'ajout d'un avis pour que les notes soient recalculées */
export function invalidateRatings() {
  cache = null;
}

/** Note moyenne et nombre d'avis d'un produit, ou null s'il n'a pas encore d'avis */
export function useRating(productId: string): Rating | null {
  const [ratings, setRatings] = useState<RatingMap>({});

  useEffect(() => {
    let active = true;
    loadRatings().then((map) => { if (active) setRatings(map); });
    return () => { active = false; };
  }, []);

  return ratings[productId] ?? null;
}
