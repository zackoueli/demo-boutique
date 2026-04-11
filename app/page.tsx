"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import ProductCard from "./ui/product-card";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { ProductGridSkeleton } from "./ui/skeletons";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";

const CATEGORIES = [
  { key: "", label: "Tous" },
  { key: "rings", label: "Bagues" },
  { key: "necklaces", label: "Colliers" },
  { key: "bracelets", label: "Bracelets" },
  { key: "earrings", label: "Boucles d'oreilles" },
] as const;

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const allSnap = await getDocs(
          query(collection(db, "products"), orderBy("createdAt", "desc"), limit(8))
        );
        const all = allSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        setProducts(all);

        // Tente de récupérer les produits vedette séparément
        try {
          const heroSnap = await getDocs(
            query(collection(db, "products"), where("featured", "==", true), limit(4))
          );
          const hero = heroSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
          setHeroProducts(hero.length >= 2 ? hero : all.slice(0, 4));
        } catch {
          setHeroProducts(all.slice(0, 4));
        }
      } catch {
        setProducts([]);
        setHeroProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = activeCategory ? products.filter((p) => p.category === activeCategory) : products;

  return (
    <div className="bg-cream">

      {/* Barre d'annonce */}
      <div className="bg-brown text-cream/80 text-xs py-2.5 text-center tracking-widest font-medium">
        ✦&nbsp; Livraison offerte dès 80 € &nbsp;·&nbsp; Bijoux artisanaux &nbsp;·&nbsp; Pièces uniques &nbsp;✦
      </div>

      {/* Hero — split */}
      <section className="grid md:grid-cols-2 min-h-[85vh] border-b border-border">

        {/* Gauche — texte */}
        <div className="flex flex-col justify-center px-8 md:px-16 py-20 gap-8 bg-sand">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.2em]">
            Collection artisanale
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-semibold leading-[1.1] text-brown">
            L&apos;art du bijou,<br />
            <em className="text-terracotta not-italic">façonné à la main</em>
          </h1>
          <p className="text-brown-light leading-relaxed max-w-sm">
            Chaque pièce est créée avec des matériaux nobles soigneusement sélectionnés, pour sublimer chaque moment qui compte.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/catalogue"
              className="flex items-center gap-2 px-7 py-3.5 bg-brown text-cream font-medium rounded-full hover:bg-brown-mid transition-colors text-sm"
            >
              Voir la collection <ArrowRight size={15} />
            </Link>
            <Link href="/catalogue" className="text-sm text-brown-light hover:text-terracotta transition-colors underline underline-offset-4">
              {products.length > 0 ? `${products.length} produits` : "Explorer"}
            </Link>
          </div>
        </div>

        {/* Droite — grille produits */}
        <div className="grid grid-cols-2 gap-px bg-border">
          {loading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="bg-parchment animate-pulse aspect-square" />
              ))
            : heroProducts.length > 0
            ? heroProducts.map((p) => <HeroTile key={p.id} product={p} />)
            : [...Array(4)].map((_, i) => <EmptyTile key={i} />)}
        </div>
      </section>

      {/* Catalogue inline */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Nos créations</p>
            <h2 className="font-serif text-3xl font-semibold text-brown">Bijoux artisanaux</h2>
          </div>
          <Link href="/catalogue" className="text-sm text-brown-light hover:text-terracotta flex items-center gap-1 transition-colors">
            Tout voir <ArrowRight size={14} />
          </Link>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeCategory === cat.key
                  ? "bg-brown text-cream border-brown"
                  : "border-border text-brown-light hover:border-brown-light hover:text-brown"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grille */}
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-brown-light">
            <ShoppingBag size={40} className="mx-auto mb-3 text-parchment" />
            <p>Aucun produit dans cette catégorie.</p>
          </div>
        )}

        {products.length >= 8 && (
          <div className="text-center mt-12">
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-brown text-brown font-medium rounded-full hover:bg-brown hover:text-cream transition-all text-sm"
            >
              Voir toute la collection <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>

      {/* Valeurs */}
      <section className="bg-sand border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { icon: "🤲", title: "Fait main", desc: "Chaque bijou est façonné à la main par nos artisans avec soin" },
            { icon: "🌿", title: "Matériaux nobles", desc: "Or, argent et pierres naturelles sélectionnés à la source" },
            { icon: "🎁", title: "Prêt à offrir", desc: "Emballage artisanal élégant, parfait pour un cadeau" },
          ].map((v) => (
            <div key={v.title} className="flex flex-col items-center gap-3">
              <span className="text-3xl">{v.icon}</span>
              <p className="font-serif font-semibold text-brown text-lg">{v.title}</p>
              <p className="text-sm text-brown-light leading-relaxed max-w-48">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroTile({ product }: { product: Product }) {
  const { addItem } = useCart();
  return (
    <Link href={`/produits/${product.slug}`} className="group relative bg-sand overflow-hidden aspect-square block">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ShoppingBag size={32} className="text-parchment" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brown/80 via-brown/30 to-transparent p-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
        <p className="text-cream text-sm font-serif font-medium truncate">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-terra-light text-sm font-semibold">{formatPrice(product.price)}</span>
          <button
            onClick={(e) => {
              e.preventDefault();
              addItem({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: 1 });
            }}
            className="p-1.5 bg-cream/20 hover:bg-terracotta rounded-lg transition-colors"
          >
            <ShoppingBag size={13} className="text-cream" />
          </button>
        </div>
      </div>
    </Link>
  );
}

function EmptyTile() {
  return (
    <div className="bg-parchment aspect-square flex items-center justify-center">
      <ShoppingBag size={28} className="text-border" />
    </div>
  );
}
