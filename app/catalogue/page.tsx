"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import ProductCard from "@/app/ui/product-card";
import { ProductGridSkeleton } from "@/app/ui/skeletons";
import { useCategories } from "@/lib/categories";
import { ChevronDown } from "lucide-react";

type SortKey = "newest" | "price_asc" | "price_desc" | "name_asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Plus récents" },
  { key: "price_asc", label: "Prix croissant" },
  { key: "price_desc", label: "Prix décroissant" },
  { key: "name_asc", label: "Nom A→Z" },
];

const PRICE_RANGES: { label: string; min: number; max: number }[] = [
  { label: "Moins de 30 €", min: 0, max: 3000 },
  { label: "30 € – 60 €", min: 3000, max: 6000 },
  { label: "60 € – 100 €", min: 6000, max: 10000 },
  { label: "Plus de 100 €", min: 10000, max: Infinity },
];

function sortProducts(products: Product[], sort: SortKey): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price_asc": return arr.sort((a, b) => a.price - b.price);
    case "price_desc": return arr.sort((a, b) => b.price - a.price);
    case "name_asc": return arr.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    default: return arr;
  }
}

function CatalogueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeCategory = searchParams.get("category") ?? "";
  const activeSubCategory = searchParams.get("sub") ?? "";

  const { categories, loading: catsLoading } = useCategories();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("newest");
  const [priceRange, setPriceRange] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setAllProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        console.error("Catalogue load error:", err);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const products = useMemo(() => {
    let list = allProducts;
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    if (activeSubCategory) list = list.filter((p) => p.subCategory === activeSubCategory);
    if (priceRange !== null) {
      const range = PRICE_RANGES[priceRange];
      list = list.filter((p) => p.price >= range.min && p.price < range.max);
    }
    return sortProducts(list, sort);
  }, [allProducts, activeCategory, activeSubCategory, sort, priceRange]);

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
        <div className="flex items-center gap-2 mb-4 flex-wrap pl-1">
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

      {/* Barre tri + filtre prix */}
      <div className="flex flex-wrap items-center gap-3 mb-8 py-3 border-y border-border">
        {/* Filtre prix — select discret */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-brown-light">Prix :</span>
          <div className="relative">
            <select
              value={priceRange ?? ""}
              onChange={(e) => setPriceRange(e.target.value === "" ? null : Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-1.5 border border-border rounded-xl text-xs text-brown bg-cream focus:outline-none focus:ring-2 focus:ring-brown cursor-pointer"
            >
              <option value="">Tous les prix</option>
              {PRICE_RANGES.map((range, idx) => (
                <option key={idx} value={idx}>{range.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brown-light pointer-events-none" />
          </div>
        </div>

        {/* Tri */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-brown-light">Trier :</span>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none pl-3 pr-8 py-1.5 border border-border rounded-xl text-xs text-brown bg-cream focus:outline-none focus:ring-2 focus:ring-brown cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brown-light pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? (
        <ProductGridSkeleton count={8} />
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="text-center py-28 text-brown-light">
          <p className="font-serif text-xl mb-2">Aucun produit pour ces filtres.</p>
          <button
            onClick={() => { setPriceRange(null); }}
            className="mt-3 text-sm text-terracotta hover:text-terra-light underline underline-offset-2"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
}

export default function CataloguePage() {
  return (
    <div className="bg-cream min-h-screen">
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
