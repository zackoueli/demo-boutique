"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import ProductCard from "@/app/ui/product-card";
import { ProductGridSkeleton } from "@/app/ui/skeletons";

const CATEGORIES = [
  { key: "", label: "Tous" },
  { key: "rings", label: "Bagues" },
  { key: "necklaces", label: "Colliers" },
  { key: "bracelets", label: "Bracelets" },
  { key: "earrings", label: "Boucles d'oreilles" },
] as const;

export default function CataloguePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeCategory = searchParams.get("category") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = activeCategory
          ? query(collection(db, "products"), where("category", "==", activeCategory), orderBy("createdAt", "desc"))
          : query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeCategory]);

  function setCategory(cat: string) {
    router.replace(cat ? `/catalogue?category=${cat}` : "/catalogue");
  }

  return (
    <div className="bg-cream min-h-screen">
      {/* En-tête */}
      <div className="bg-sand border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">
            Nos créations
          </p>
          <h1 className="font-serif text-4xl font-semibold text-brown">Catalogue</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Filtres */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
                activeCategory === cat.key
                  ? "bg-brown text-cream border-brown"
                  : "border-border text-brown-light hover:border-brown-light hover:text-brown bg-cream"
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="ml-auto text-sm text-brown-light">
            {loading ? "…" : `${products.length} produit${products.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-28 text-brown-light">
            <p className="font-serif text-xl mb-2">Aucun produit ici pour l&apos;instant.</p>
            <p className="text-sm">Revenez bientôt ou explorez une autre catégorie.</p>
          </div>
        )}
      </div>
    </div>
  );
}
