"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import ProductCard from "@/app/ui/product-card";
import { ProductGridSkeleton } from "@/app/ui/skeletons";
import { useCategories } from "@/lib/categories";

function CatalogueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeCategory = searchParams.get("category") ?? "";
  const activeSubCategory = searchParams.get("sub") ?? "";

  const { categories, loading: catsLoading } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        let filtered = all;
        if (activeCategory) filtered = filtered.filter((p) => p.category === activeCategory);
        if (activeSubCategory) filtered = filtered.filter((p) => p.subCategory === activeSubCategory);
        setProducts(filtered);
      } catch (err) {
        console.error("Catalogue load error:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeCategory, activeSubCategory]);

  function setCategory(cat: string) {
    router.push(cat ? `/catalogue?category=${cat}` : "/catalogue");
  }

  function setSubCategory(sub: string) {
    router.push(sub ? `/catalogue?category=${activeCategory}&sub=${sub}` : `/catalogue?category=${activeCategory}`);
  }

  const activeCatObj = categories.find((c) => c.key === activeCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Filtres catégories */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setCategory("")}
          className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
            !activeCategory ? "bg-brown text-cream border-brown" : "border-border text-brown-light hover:border-brown-light hover:text-brown bg-cream"
          }`}
        >
          Tous
        </button>
        {catsLoading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-9 w-24 bg-parchment rounded-full animate-pulse" />)
          : categories.map((cat) => (
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

      {/* Filtres sous-catégories */}
      {activeCatObj && (activeCatObj.subCategories ?? []).length > 0 && (
        <div className="flex items-center gap-2 mb-8 flex-wrap pl-1">
          <button
            onClick={() => setSubCategory("")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !activeSubCategory ? "bg-terracotta text-white border-terracotta" : "border-border text-brown-light hover:border-terracotta hover:text-terracotta bg-cream"
            }`}
          >
            Toutes
          </button>
          {activeCatObj.subCategories.map((sub) => (
            <button
              key={sub.key}
              onClick={() => setSubCategory(sub.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeSubCategory === sub.key
                  ? "bg-terracotta text-white border-terracotta"
                  : "border-border text-brown-light hover:border-terracotta hover:text-terracotta bg-cream"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
      {(!activeCatObj || (activeCatObj.subCategories ?? []).length === 0) && <div className="mb-8" />}

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
  );
}

export default function CataloguePage() {
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
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-10"><ProductGridSkeleton count={8} /></div>}>
        <CatalogueContent />
      </Suspense>
    </div>
  );
}
