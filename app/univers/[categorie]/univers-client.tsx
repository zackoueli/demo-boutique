"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import ProductCard from "@/app/ui/product-card";
import { ProductGridSkeleton } from "@/app/ui/skeletons";
import { getUniversContent } from "./univers-content";

export default function UniversClient({
  categoryKey,
  categoryLabel,
}: {
  categoryKey: string;
  categoryLabel: string;
}) {
  const content = getUniversContent(categoryKey);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "products"),
          where("category", "==", categoryKey),
          limit(8)
        );
        const snap = await getDocs(q);
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [categoryKey]);

  return (
    <div className="bg-cream min-h-screen">
      {/* Hero éditorial */}
      <div className="bg-sand border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-3">
            {content.tagline}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-brown mb-5">
            {categoryLabel}
          </h1>
          <p className="text-brown-light leading-relaxed">{content.intro}</p>
          <Link
            href={`/catalogue/${categoryKey}`}
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-brown text-cream rounded-full text-sm font-medium hover:bg-brown-mid transition-colors"
          >
            Voir la collection <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Sections éditoriales */}
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
        {content.sections.map((section) => (
          <div key={section.title}>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-3">{section.title}</h2>
            <p className="text-brown-light leading-relaxed">{section.body}</p>
          </div>
        ))}

        {content.materials.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-3">Matériaux utilisés</h2>
            <div className="flex flex-wrap gap-2">
              {content.materials.map((m) => (
                <span
                  key={m}
                  className="text-sm px-4 py-1.5 rounded-full border border-border text-brown-light bg-sand"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Produits de la catégorie */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-serif text-2xl font-semibold text-brown">Découvrir les créations</h2>
          <Link
            href={`/catalogue/${categoryKey}`}
            className="text-sm text-brown-light hover:text-terracotta transition-colors"
          >
            Voir tout →
          </Link>
        </div>

        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="text-center py-16 text-brown-light">
            Aucun produit disponible pour le moment dans cette collection.
          </p>
        )}
      </div>
    </div>
  );
}
