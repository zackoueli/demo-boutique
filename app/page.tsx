"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import ProductCard from "./ui/product-card";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag, Heart, Sparkles } from "lucide-react";
import { ProductGridSkeleton } from "./ui/skeletons";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import dynamic from "next/dynamic";
import { useCategories } from "@/lib/categories";
const PolaroidSection = dynamic(() => import("./ui/polaroid-section"), { ssr: false });

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("");
  const { categories } = useCategories();

  useEffect(() => {
    async function load() {
      try {
        const allSnap = await getDocs(
          query(collection(db, "products"), orderBy("createdAt", "desc"), limit(8))
        );
        const all = allSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        setProducts(all);
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
    <div className="bg-[#fdf8f4]">

      {/* Barre d'annonce */}
      <div className="bg-[#c0826a] text-white/90 text-xs py-2.5 text-center tracking-widest font-medium">
        ✦&nbsp; Livraison offerte dès 80 € &nbsp;·&nbsp; Créations artisanales en résine &nbsp;·&nbsp; Pièces uniques &nbsp;✦
      </div>

      {/* Hero */}
      <section className="grid md:grid-cols-2 min-h-[88vh] border-b border-[#e8ddd5]">

        {/* Gauche — texte */}
        <div className="flex flex-col justify-center px-8 md:px-16 py-20 gap-7" style={{ background: "linear-gradient(135deg, #fdf3ee 0%, #f7ece4 100%)" }}>
          <p className="text-xs font-medium uppercase tracking-[0.25em]" style={{ color: "#c0826a" }}>
            Histoire Eternelle · L&apos;Atelier d&apos;Anaïs
          </p>
          <h1 className="font-serif leading-[1.15] text-brown" style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)" }}>
            Des créations qui<br />
            <em className="not-italic" style={{ color: "#c0826a" }}>gardent vos plus belles histoires</em>
          </h1>
          <p className="leading-relaxed max-w-sm text-base" style={{ color: "#8a6858" }}>
            Maman de trois enfants, je façonne des bijoux en résine pour capturer les instants précieux —
            une mèche de cheveux, une goutte de lait, une fleur séchée. Parce que certaines émotions méritent de durer éternellement.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/catalogue"
              className="flex items-center gap-2 px-7 py-3.5 text-white font-medium rounded-full transition-colors text-sm"
              style={{ background: "#3d2b1f" }}
            >
              Découvrir les créations <ArrowRight size={15} />
            </Link>
            <Link href="/a-propos" className="text-sm underline underline-offset-4 transition-colors" style={{ color: "#c0826a" }}>
              En savoir plus sur Anaïs
            </Link>
          </div>
        </div>

        {/* Droite — grille produits */}
        <div className="grid grid-cols-2 gap-px" style={{ background: "#e8ddd5" }}>
          {loading
            ? [...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse aspect-square" style={{ background: "#f5ede6" }} />
              ))
            : heroProducts.length > 0
            ? heroProducts.map((p) => <HeroTile key={p.id} product={p} />)
            : [...Array(4)].map((_, i) => <EmptyTile key={i} />)}
        </div>
      </section>

      {/* Bloc "à propos" doux */}
      <section style={{ background: "#fdf3ee", borderBottom: "1px solid #e8ddd5" }}>
        <div className="max-w-3xl mx-auto px-4 py-14 text-center">
          <Heart size={22} className="mx-auto mb-5" style={{ color: "#c0826a" }} />
          <p className="font-serif text-2xl md:text-3xl font-semibold leading-snug mb-5" style={{ color: "#3d2b1f" }}>
            &ldquo;Je ne fabrique pas des bijoux. Je préserve des émotions.&rdquo;
          </p>
          <p className="leading-relaxed max-w-xl mx-auto" style={{ color: "#8a6858" }}>
            Chaque pièce est créée avec une intention : honorer un moment, un lien, une histoire.
            Ici, vous n&apos;êtes pas un numéro de commande — vous êtes une histoire qui mérite d&apos;être préservée.
          </p>
          <Link href="/a-propos" className="inline-flex items-center gap-2 mt-6 text-sm font-medium transition-colors" style={{ color: "#c0826a" }}>
            Découvrir mon histoire <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Catalogue inline */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] mb-1" style={{ color: "#c0826a" }}>Mes créations</p>
            <h2 className="font-serif text-3xl font-semibold" style={{ color: "#3d2b1f" }}>La collection</h2>
          </div>
          <Link href="/catalogue" className="text-sm flex items-center gap-1 transition-colors" style={{ color: "#8a6858" }}>
            Tout voir <ArrowRight size={14} />
          </Link>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory("")}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all"
            style={{
              background: activeCategory === "" ? "#3d2b1f" : "transparent",
              color: activeCategory === "" ? "#fdf8f4" : "#8a6858",
              borderColor: activeCategory === "" ? "#3d2b1f" : "#e8ddd5",
            }}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all"
              style={{
                background: activeCategory === cat.key ? "#3d2b1f" : "transparent",
                color: activeCategory === cat.key ? "#fdf8f4" : "#8a6858",
                borderColor: activeCategory === cat.key ? "#3d2b1f" : "#e8ddd5",
              }}
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
          <div className="text-center py-20" style={{ color: "#8a6858" }}>
            <ShoppingBag size={40} className="mx-auto mb-3" style={{ color: "#e8ddd5" }} />
            <p>Aucun produit dans cette catégorie.</p>
          </div>
        )}

        {products.length >= 8 && (
          <div className="text-center mt-12">
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-8 py-3.5 border-2 font-medium rounded-full transition-all text-sm"
              style={{ borderColor: "#3d2b1f", color: "#3d2b1f" }}
            >
              Voir toute la collection <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </section>

      {/* Photos Souvenirs — Polaroïd interactif */}
      <PolaroidSection />

      {/* Valeurs */}
      <section style={{ background: "#fdf3ee", borderTop: "1px solid #e8ddd5" }}>
        <div className="max-w-5xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { icon: "🤱", title: "Créée avec amour", desc: "Chaque pièce naît d'une intention sincère, façonnée à la main avec patience et douceur." },
            { icon: "✨", title: "Résine & matières vivantes", desc: "Lait maternel, cheveux, fleurs séchées… je préserve ce qui vous est précieux." },
            { icon: "💌", title: "Proche de vous", desc: "Vous méritez d'être écoutée. Chaque commande est un échange humain, pas une transaction." },
          ].map((v) => (
            <div key={v.title} className="flex flex-col items-center gap-3">
              <span className="text-3xl">{v.icon}</span>
              <p className="font-serif font-semibold text-lg" style={{ color: "#3d2b1f" }}>{v.title}</p>
              <p className="text-sm leading-relaxed max-w-52" style={{ color: "#8a6858" }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section style={{ background: "#3d2b1f" }} className="py-16 px-4 text-center">
        <Sparkles size={24} className="mx-auto mb-5 text-[#c0826a]" />
        <h2 className="font-serif text-2xl md:text-3xl font-semibold text-white mb-4">
          Prête à préserver votre histoire ?
        </h2>
        <p className="mb-8 max-w-md mx-auto text-sm leading-relaxed" style={{ color: "#c8b49a" }}>
          Contactez-moi pour une création personnalisée, ou explorez les pièces disponibles.
          Je serai ravie d&apos;échanger avec vous.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/catalogue"
            className="flex items-center justify-center gap-2 px-7 py-3.5 bg-[#c0826a] text-white font-medium rounded-full hover:bg-[#a86d58] transition-colors text-sm"
          >
            Voir les créations <ArrowRight size={15} />
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2 px-7 py-3.5 border border-white/20 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors text-sm"
          >
            Me contacter
          </Link>
        </div>
      </section>

    </div>
  );
}

function HeroTile({ product }: { product: Product }) {
  const { addItem } = useCart();
  return (
    <Link href={`/produits/${product.slug}`} className="group relative overflow-hidden aspect-square block" style={{ background: "#f5ede6" }}>
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
          <ShoppingBag size={32} style={{ color: "#e8ddd5" }} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-300" style={{ background: "linear-gradient(to top, rgba(61,43,31,0.85), rgba(61,43,31,0.2), transparent)" }}>
        <p className="text-white text-sm font-serif font-medium truncate">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-semibold" style={{ color: "#e8c4a8" }}>{formatPrice(product.price)}</span>
          <button
            onClick={(e) => {
              e.preventDefault();
              addItem({ cartItemId: product.id, productId: product.id, name: product.name, price: product.price, basePrice: product.price, imageUrl: product.imageUrl, quantity: 1 });
            }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <ShoppingBag size={13} className="text-white" />
          </button>
        </div>
      </div>
    </Link>
  );
}

function EmptyTile() {
  return (
    <div className="aspect-square flex items-center justify-center" style={{ background: "#f5ede6" }}>
      <ShoppingBag size={28} style={{ color: "#e8ddd5" }} />
    </div>
  );
}
