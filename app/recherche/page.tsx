"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import ProductCard from "@/app/ui/product-card";
import { Search } from "lucide-react";
import { ProductGridSkeleton } from "@/app/ui/skeletons";

function RechercheContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) { setLoading(false); return; }
    setLoading(true);
    getDocs(collection(db, "products"))
      .then((snap) => {
        const query = q.toLowerCase();
        const found = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Product))
          .filter((p) =>
            p.name.toLowerCase().includes(query) ||
            p.description?.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
          );
        setResults(found);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q]);

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
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : !q ? (
          <div className="text-center py-24 text-brown-light">
            <Search size={40} className="mx-auto mb-4 text-parchment" />
            <p className="font-serif text-lg">Utilisez la barre de recherche pour trouver un bijou.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-24 text-brown-light">
            <Search size={40} className="mx-auto mb-4 text-parchment" />
            <p className="font-serif text-lg mb-2">Aucun résultat pour &ldquo;{q}&rdquo;</p>
            <p className="text-sm">Essayez un autre mot-clé ou parcourez le catalogue.</p>
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
