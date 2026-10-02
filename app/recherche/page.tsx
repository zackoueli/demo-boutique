"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import ProductCard from "@/app/ui/product-card";
import Link from "next/link";
import { Search } from "lucide-react";
import { ProductGridSkeleton } from "@/app/ui/skeletons";
import { useCategories } from "@/lib/categories";
import { searchProducts } from "@/lib/search";
import { trackSearch } from "@/lib/analytics";

function RechercheContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { categories } = useCategories();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    getDocs(collection(db, "products"))
      .then((snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))))
      .catch(() => setProducts([]));
  }, []);

  const loading = products === null;
  const results = useMemo(() => {
    const labels = Object.fromEntries(categories.map((c) => [c.key, c.label]));
    return searchProducts(products ?? [], q, labels);
  }, [products, q, categories]);

  // Journal des recherches : celles sans résultat signalent un produit à renommer ou à ajouter
  useEffect(() => {
    if (!loading && q.trim()) trackSearch(q, results.length);
  }, [loading, q, results.length]);

  return (
    <>
      <div className="bg-sand border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">Recherche</p>
          <h1 className="font-serif text-3xl font-semibold text-brown">
            {q ? <>Résultats pour &ldquo;<em className="text-terracotta not-italic">{q}</em>&rdquo;</> : "Recherche"}
          </h1>
          {!loading && q && (
            <p className="text-sm text-brown-light mt-2">
              {results.length} résultat{results.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {!q ? (
          <div className="text-center py-24 text-brown-light">
            <Search size={40} className="mx-auto mb-4 text-parchment" />
            <p className="font-serif text-lg">Utilisez la barre de recherche pour trouver un bijou.</p>
          </div>
        ) : loading ? (
          <ProductGridSkeleton count={8} />
        ) : results.length === 0 ? (
          <div className="text-center py-24 text-brown-light">
            <Search size={40} className="mx-auto mb-4 text-parchment" />
            <p className="font-serif text-lg mb-2">Aucun résultat pour &ldquo;{q}&rdquo;</p>
            <p className="text-sm">
              Essayez un autre mot-clé, <Link href="/catalogue" className="text-terracotta hover:underline">parcourez le catalogue</Link> ou{" "}
              <Link href="/contact" className="text-terracotta hover:underline">décrivez votre idée à Anaïs</Link> pour une création sur mesure.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </>
  );
}

export default function RecherchePage() {
  return (
    <div className="bg-cream min-h-screen">
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-10"><ProductGridSkeleton count={8} /></div>}>
        <RechercheContent />
      </Suspense>
    </div>
  );
}
