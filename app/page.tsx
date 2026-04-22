"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useCategories } from "@/lib/categories";
import type { Category } from "@/lib/categories";
const PolaroidSection = dynamic(() => import("./ui/polaroid-section"), { ssr: false });

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const { categories }: { categories: Category[] } = useCategories();

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, "products"), where("featured", "==", true), limit(20))
        );
        const featured = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        if (featured.length < 2) {
          const fill = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(20)));
          setFeaturedProducts(fill.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        } else {
          setFeaturedProducts(featured);
        }
      } catch {
        setFeaturedProducts([]);
      }
    }
    load();
  }, []);

  return (
    <div style={{ background: "#fdf8f4" }}>

      {/* Barre d'annonce */}
      <div style={{ background: "#3d2b1f" }} className="text-white/70 text-xs py-2 text-center tracking-widest font-medium">
        ✦&nbsp; Livraison offerte dès 80 € &nbsp;·&nbsp; Créations artisanales en résine &nbsp;·&nbsp; Bretagne &nbsp;✦
      </div>

      {/* ══════════════════════════════════════
          HERO — Entrée dans l'atelier
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: "100vh", background: "#fdf3ee" }}>

        {/* Texture grain subtile */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px"
        }} />

        {/* Lumière chaude venant du coin haut-droit */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] pointer-events-none" style={{
          background: "radial-gradient(ellipse at top right, rgba(192,130,106,0.18) 0%, transparent 65%)"
        }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none" style={{
          background: "radial-gradient(ellipse at bottom left, rgba(61,43,31,0.06) 0%, transparent 65%)"
        }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-0 md:pt-24 grid md:grid-cols-2 gap-0 items-end min-h-[calc(100vh-2rem)]">

          {/* Gauche — texte */}
          <div className="flex flex-col justify-center gap-8 pb-16 md:pb-24">
            <FadeIn>
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "#c0826a" }}>
                <MapPin size={12} />
                <span className="uppercase tracking-[0.25em]">Bretagne · Atelier artisanal</span>
              </div>
            </FadeIn>

            <FadeIn delay={80}>
              <h1 className="font-serif font-semibold leading-[1.08]" style={{ fontSize: "clamp(3rem, 5.5vw, 5rem)", color: "#3d2b1f" }}>
                Bienvenue<br />
                dans mon<br />
                <em className="not-italic" style={{ color: "#c0826a" }}>atelier.</em>
              </h1>
            </FadeIn>

            <FadeIn delay={160}>
              <p className="text-lg leading-relaxed max-w-md" style={{ color: "#8a6858" }}>
                Je m&apos;appelle Anaïs. Ici, dans ce petit coin de Bretagne,
                je façonne à la main des bijoux en résine qui gardent vivants
                vos souvenirs les plus précieux.
              </p>
            </FadeIn>

            <FadeIn delay={240}>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/a-propos"
                  className="flex items-center gap-2 px-7 py-3.5 text-white font-medium rounded-full text-sm transition-all hover:opacity-90"
                  style={{ background: "#3d2b1f" }}
                >
                  Entrer dans l&apos;atelier <ArrowRight size={14} />
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-7 py-3.5 border font-medium rounded-full text-sm transition-all hover:bg-white/50"
                  style={{ borderColor: "#c0826a", color: "#c0826a" }}
                >
                  <Mail size={14} /> Écrire à Anaïs
                </Link>
              </div>
            </FadeIn>

            {/* Petits détails artisanaux */}
            <FadeIn delay={320}>
              <div className="flex gap-6 pt-2">
                {[
                  { val: "100%", label: "Fait main" },
                  { val: "Résine", label: "ArtResin & Resiners" },
                  { val: "Unique", label: "Chaque pièce" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="font-serif font-semibold text-sm" style={{ color: "#3d2b1f" }}>{item.val}</p>
                    <p className="text-xs" style={{ color: "#b09080" }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Droite — accès bijoux mémoriels */}
          <FadeIn delay={100} className="relative flex items-center justify-center pb-16 md:pb-24">
            <MemorialCard categories={categories} />
          </FadeIn>
        </div>

        {/* Vague de transition */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 80 }}>
          <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            <path d="M0,80 C360,20 1080,20 1440,80 L1440,80 L0,80 Z" fill="#fdf8f4" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION — Collections
      ══════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <FadeIn>
            <div className="text-center mb-10">
              <p className="text-xs font-medium uppercase tracking-[0.25em] mb-2" style={{ color: "#c0826a" }}>L&apos;atelier</p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold" style={{ color: "#3d2b1f" }}>Collections</h2>
            </div>
          </FadeIn>

          <div className={`grid gap-4 ${categories.length === 1 ? "grid-cols-1" : categories.length === 2 ? "grid-cols-2" : categories.length === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"}`}>
            {categories.map((cat, i) => (
              <FadeIn key={cat.id} delay={i * 70}>
                <Link
                  href={`/catalogue?category=${cat.key}`}
                  className="group relative block overflow-hidden rounded-2xl"
                  style={{ aspectRatio: categories.length <= 2 ? "2/3" : categories.length === 3 && i === 0 ? "2/3" : "3/4", minHeight: 320 }}
                >
                  {/* Image ou fond dégradé */}
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.label}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0" style={{
                      background: `linear-gradient(135deg, hsl(${20 + i * 30}, 35%, ${78 - i * 5}%), hsl(${30 + i * 30}, 30%, ${68 - i * 5}%))`
                    }} />
                  )}

                  {/* Overlay sombre au bas */}
                  <div className="absolute inset-0" style={{
                    background: "linear-gradient(to top, rgba(30,15,5,0.75) 0%, rgba(30,15,5,0.2) 45%, transparent 70%)"
                  }} />

                  {/* Texte */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                    <p className="font-serif text-xl md:text-2xl font-semibold text-white leading-tight mb-1">
                      {cat.label}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70 flex items-center gap-1.5 transition-all duration-300 group-hover:gap-3">
                      Je découvre <ArrowRight size={11} />
                    </p>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          SECTION — Mes coups de cœur
      ══════════════════════════════════════ */}
      {featuredProducts.length > 0 && (
        <CoupsDeCoeur products={featuredProducts} />
      )}

      {/* ══════════════════════════════════════
          SECTION — La femme derrière l'atelier
      ══════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-5 gap-12 items-center">

          <FadeIn className="md:col-span-3">
            <div className="space-y-6">
              <p className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: "#c0826a" }}>La femme derrière l&apos;atelier</p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold leading-[1.2]" style={{ color: "#3d2b1f" }}>
                Un souvenir confié,<br />une vie préservée.
              </h2>
              <p className="leading-relaxed text-base" style={{ color: "#8a6858" }}>
                Maman de trois enfants, femme de militaire, je sais ce que c&apos;est que de
                vivre dans l&apos;impermanence — de tenir des instants qui filent trop vite.
                C&apos;est cette douleur douce qui m&apos;a amenée à la résine.
              </p>
              <p className="leading-relaxed text-base" style={{ color: "#8a6858" }}>
                Lait maternel, mèches de cheveux, fleurs séchées, cendres…
                Chaque élément que vous me confiez est reçu avec respect et gratitude.
                <strong style={{ color: "#3d2b1f" }}> Je sais ce qu&apos;il représente.</strong>
              </p>
              <Link href="/a-propos" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: "#c0826a" }}>
                Mon histoire complète <ArrowRight size={13} />
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={120} className="md:col-span-2">
            <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: "3/4", boxShadow: "0 16px 48px rgba(61,43,31,0.18)" }}>
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/fir-boutique-754bb.firebasestorage.app/o/image%20170.png?alt=media&token=21cfe27b-d371-4eea-a3fb-b607f30b6bb7"
                alt="Anaïs, fondatrice"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </FadeIn>

        </div>
      </section>

      {/* ══════════════════════════════════════
          SECTION — Photos souvenirs polaroïd
      ══════════════════════════════════════ */}
      <PolaroidSection />

      {/* ══════════════════════════════════════
          CTA — Parlons de votre projet
      ══════════════════════════════════════ */}
      <section className="px-6 py-16 md:py-24">
        <FadeIn>
          <div className="max-w-3xl mx-auto rounded-3xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #3d2b1f 0%, #6b4535 100%)" }}>
            {/* Lumière décorative */}
            <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" style={{
              background: "radial-gradient(circle, rgba(192,130,106,0.3) 0%, transparent 70%)",
              transform: "translate(20%, -20%)"
            }} />
            <div className="relative px-10 md:px-16 py-14 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.25em] mb-4" style={{ color: "#c0826a" }}>
                Votre histoire mérite d&apos;être préservée
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold text-white mb-5">
                Parlons de votre projet
              </h2>
              <p className="max-w-sm mx-auto leading-relaxed mb-10" style={{ color: "#c8b49a" }}>
                Un souvenir à préserver ? Une idée ? Écrivez-moi —
                chaque conversation commence par un échange humain, jamais une transaction.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 px-8 py-4 font-medium rounded-full text-sm transition-all hover:opacity-90"
                  style={{ background: "#c0826a", color: "white" }}
                >
                  <Mail size={15} /> Écrire à Anaïs
                </Link>
                <Link
                  href="/catalogue"
                  className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors text-sm"
                >
                  Voir les créations <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

    </div>
  );
}

/* ── Carte d'accès bijoux mémoriels — hero droit ── */
function MemorialCard({ categories }: { categories: Category[] }) {
  const memorialCat = categories.find(
    (c) => c.key?.toLowerCase().includes("memoriel") || c.key?.toLowerCase().includes("memorial") || c.label?.toLowerCase().includes("mémoriel")
  );
  const href = memorialCat ? `/catalogue?category=${memorialCat.key}` : "/catalogue";

  return (
    <Link
      href={href}
      className="group relative block rounded-3xl overflow-hidden w-full max-w-md"
      style={{
        aspectRatio: "3/4",
        maxHeight: "min(75vh, 580px)",
        boxShadow: "0 24px 64px rgba(61,43,31,0.22)",
      }}
    >
      {/* Photo de la catégorie ou fond dégradé fallback */}
      {memorialCat?.imageUrl ? (
        <Image
          src={memorialCat.imageUrl}
          alt="Bijoux mémoriels"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0" style={{
          background: "linear-gradient(160deg, #2a1a10 0%, #5a3520 50%, #3d2b1f 100%)"
        }} />
      )}

      {/* Overlay sombre pour lisibilité du texte */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to top, rgba(20,10,5,0.88) 0%, rgba(20,10,5,0.45) 50%, rgba(20,10,5,0.2) 100%)"
      }} />

      {/* Contenu */}
      <div className="relative h-full flex flex-col justify-between p-8 md:p-10">

        {/* Badge haut */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c0826a" }} />
          <p className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: "#c0826a" }}>
            Mon univers principal
          </p>
        </div>

        {/* Centre — texte principal */}
        <div className="flex flex-col gap-5">
          <h2 className="font-serif font-semibold text-white leading-[1.15]" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)" }}>
            Bijoux<br />
            <em className="not-italic" style={{ color: "#c0826a" }}>mémoriels</em>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#c8b49a", maxWidth: "26ch" }}>
            Je transforme vos souvenirs les plus précieux — lait maternel, mèches de cheveux,
            fleurs séchées — en un bijou unique à porter près du cœur.
          </p>

          {/* Tags inclusions */}
          <div className="flex flex-wrap gap-2">
            {["Lait maternel", "Cheveux", "Fleurs", "Cendres"].map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full"
                style={{ background: "rgba(192,130,106,0.15)", color: "#c0826a", border: "1px solid rgba(192,130,106,0.25)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA bas */}
        <div
          className="flex items-center gap-2 text-sm font-medium transition-all duration-300 group-hover:gap-4"
          style={{ color: "white" }}
        >
          Découvrir la collection <ArrowRight size={15} />
        </div>
      </div>
    </Link>
  );
}

/* ── Carrousel "Mes coups de cœur" ── */
function CoupsDeCoeur({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft ?? 0);
    scrollLeft.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = "grabbing";
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    if (Math.abs(walk) > 4) hasDragged.current = true;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  }

  function onMouseUp() {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }

  function onClickCapture(e: React.MouseEvent) {
    if (hasDragged.current) e.preventDefault();
  }

  return (
    <section style={{ borderTop: "1px solid #e8ddd5", borderBottom: "1px solid #e8ddd5", background: "#fdf8f4" }} className="py-12 md:py-14">

      {/* Header — même padding que le reste de la page */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 mb-7">
        <FadeIn>
          <p className="text-xs font-medium uppercase tracking-[0.25em] mb-1" style={{ color: "#c0826a" }}>Sélection</p>
          <h2 className="font-serif text-3xl font-semibold" style={{ color: "#3d2b1f" }}>Mes coups de cœur</h2>
        </FadeIn>
      </div>

      {/* Carrousel : aligné à gauche avec le titre, déborde à droite */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto select-none"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingLeft: "max(1.5rem, calc((100vw - 72rem) / 2 + 3rem))",
          paddingRight: "clamp(1.5rem, 5vw, 3rem)",
          paddingBottom: 8,
          cursor: "grab",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClickCapture={onClickCapture}
      >
        {products.map((p, i) => (
          <Link
            key={p.id}
            href={`/produits/${p.slug}`}
            className="group flex-shrink-0 block overflow-hidden transition-all"
            style={{ width: "clamp(240px, 28vw, 340px)" }}
            draggable={false}
          >
            <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "3/4" }}>
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  sizes="260px"
                  className="object-cover transition-transform duration-600 group-hover:scale-105"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: `hsl(${20 + i * 20}, 28%, ${85 - i * 2}%)` }}>
                  <span className="text-4xl opacity-30">✨</span>
                </div>
              )}
            </div>
            <div className="pt-3 pb-1">
              <p className="font-serif font-semibold text-sm truncate" style={{ color: "#3d2b1f" }}>{p.name}</p>
              <p className="text-sm font-medium mt-1" style={{ color: "#3d2b1f" }}>{p.price ? (p.price / 100).toFixed(2) : "—"} €</p>
              <p className="text-xs mt-0.5" style={{ color: "#b09080" }}>Pièce unique · Fait main</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Animation fade-in au scroll ── */
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transition = `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0, transform: "translateY(24px)" }}>
      {children}
    </div>
  );
}
