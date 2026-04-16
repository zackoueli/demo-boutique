"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Heart, Mail } from "lucide-react";
import dynamic from "next/dynamic";
const PolaroidSection = dynamic(() => import("./ui/polaroid-section"), { ssr: false });

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, "products"), where("featured", "==", true), limit(3))
        );
        const featured = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        if (featured.length < 3) {
          const fill = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(3)));
          setFeaturedProducts(fill.docs.map((d) => ({ id: d.id, ...d.data() } as Product)).slice(0, 3));
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
      <div className="bg-[#c0826a] text-white/90 text-xs py-2.5 text-center tracking-widest font-medium">
        ✦&nbsp; Livraison offerte dès 80 € &nbsp;·&nbsp; Créations artisanales en résine &nbsp;·&nbsp; Pièces uniques &nbsp;✦
      </div>

      {/* ── HERO — pleine hauteur, texte centré ── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden" style={{ background: "linear-gradient(160deg, #fdf3ee 0%, #f5e6d8 60%, #eeddd2 100%)" }}>

        {/* Cercles décoratifs animés */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(192,130,106,0.12) 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(192,130,106,0.08) 0%, transparent 70%)", transform: "translate(-20%, 20%)" }} />

        <FadeIn className="relative z-10 max-w-3xl flex flex-col items-center gap-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em]" style={{ color: "#c0826a" }}>
            Histoire Éternelle · L&apos;Atelier d&apos;Anaïs · Bretagne
          </p>

          <h1 className="font-serif font-semibold leading-[1.1]" style={{ fontSize: "clamp(2.8rem, 6vw, 4.5rem)", color: "#3d2b1f" }}>
            Certains instants méritent<br />
            <em className="not-italic" style={{ color: "#c0826a" }}>de ne jamais disparaître.</em>
          </h1>

          <p className="text-lg leading-relaxed max-w-xl" style={{ color: "#8a6858" }}>
            Je m&apos;appelle Anaïs. Maman de trois enfants, je façonne à la main des bijoux en résine
            qui préservent ce que vous avez de plus précieux — un souvenir, un lien, une émotion.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/a-propos"
              className="flex items-center gap-2 px-8 py-4 text-white font-medium rounded-full transition-all hover:opacity-90 text-sm"
              style={{ background: "#3d2b1f" }}
            >
              Découvrir mon histoire <ArrowRight size={15} />
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 px-8 py-4 border font-medium rounded-full transition-all text-sm hover:bg-white/60"
              style={{ borderColor: "#c0826a", color: "#c0826a" }}
            >
              <Mail size={15} /> Me contacter
            </Link>
          </div>
        </FadeIn>

        {/* Vague bas */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 70 }}>
          <svg viewBox="0 0 1440 70" fill="none" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            <path d="M0,70 C480,10 960,10 1440,70 L1440,70 L0,70 Z" fill="#fdf8f4" />
          </svg>
        </div>
      </section>

      {/* ── QUI EST ANAÏS ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          <FadeIn>
            <div className="space-y-6" style={{ color: "#8a6858" }}>
              <p className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "#c0826a" }}>Mon atelier, mon cœur</p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold leading-tight" style={{ color: "#3d2b1f" }}>
                Je ne crée pas des bijoux.<br />Je préserve des émotions.
              </h2>
              <p className="leading-relaxed">
                Chacune de mes maternités a été une transformation profonde. Ces instants — les premières heures,
                le regard d&apos;un nouveau-né, la douceur du lait maternel — ont quelque chose d&apos;ineffable.
                On sait qu&apos;ils vont passer. Et c&apos;est cette douleur douce qui m&apos;a donné l&apos;envie
                de <em>figer le temps.</em>
              </p>
              <p className="leading-relaxed">
                Lait maternel, mèches de cheveux, fleurs séchées, cendres… Chaque élément confié est accueilli
                avec respect et gratitude. Je sais ce qu&apos;il représente. Je sais ce qu&apos;il raconte.
              </p>
              <Link
                href="/a-propos"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: "#c0826a" }}
              >
                Lire mon histoire complète <ArrowRight size={14} />
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            {/* Carte portrait */}
            <div className="relative">
              <div className="rounded-3xl overflow-hidden aspect-[4/5]" style={{ background: "linear-gradient(135deg, #f5e6d8, #eeddd2)" }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-3 p-8">
                    <span className="text-6xl">🤱</span>
                    <p className="font-serif text-lg italic" style={{ color: "#8a6858" }}>Photo d&apos;Anaïs à venir</p>
                  </div>
                </div>
              </div>
              {/* Badge flottant */}
              <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl px-5 py-4 shadow-lg border" style={{ borderColor: "#e8ddd5" }}>
                <p className="font-serif text-2xl font-bold" style={{ color: "#3d2b1f" }}>100%</p>
                <p className="text-xs" style={{ color: "#8a6858" }}>Fait à la main<br />en Bretagne</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PROCESSUS — comment ça marche ── */}
      <section style={{ background: "linear-gradient(135deg, #3d2b1f, #5a3e2e)", borderTop: "1px solid #e8ddd5" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, #c0826a, transparent)" }} />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20">
          <FadeIn>
            <div className="text-center mb-14">
              <p className="text-xs font-medium uppercase tracking-[0.2em] mb-3" style={{ color: "#c0826a" }}>Un processus humain</p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold text-white">Comment je travaille</h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: "01", icon: "💬", title: "On se parle", desc: "Vous me contactez, on échange sur votre projet. Je vous écoute vraiment." },
              { num: "02", icon: "📦", title: "Vous m'envoyez", desc: "Vous me confiez votre précieux souvenir. Je le reçois avec soin et respect." },
              { num: "03", icon: "✨", title: "Je crée", desc: "Je façonne votre bijou à la main, avec la résine la plus adaptée à votre souvenir." },
              { num: "04", icon: "💌", title: "Je vous livre", desc: "Votre création unique vous parvient, emballée avec amour, prête à vous émouvoir." },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 80}>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto" style={{ background: "rgba(255,255,255,0.08)" }}>
                    {step.icon}
                  </div>
                  <p className="text-xs font-medium" style={{ color: "#c0826a" }}>{step.num}</p>
                  <p className="font-serif font-semibold text-white">{step.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#c8b49a" }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Vague bas */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 60 }}>
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            <path d="M0,60 C480,0 960,0 1440,60 L1440,60 L0,60 Z" fill="#fdf8f4" />
          </svg>
        </div>
      </section>

      {/* ── APERÇU CRÉATIONS ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <FadeIn>
          <div className="text-center mb-12">
            <p className="text-xs font-medium uppercase tracking-[0.2em] mb-3" style={{ color: "#c0826a" }}>Un aperçu de l&apos;atelier</p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold" style={{ color: "#3d2b1f" }}>Quelques créations récentes</h2>
            <p className="mt-3 max-w-lg mx-auto leading-relaxed" style={{ color: "#8a6858" }}>
              Chaque pièce est unique — façonnée à partir de votre souvenir, pour votre histoire.
            </p>
          </div>
        </FadeIn>

        {featuredProducts.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {featuredProducts.map((p, i) => (
              <FadeIn key={p.id} delay={i * 80}>
                <Link href={`/produits/${p.slug}`} className="group block rounded-3xl overflow-hidden border transition-shadow hover:shadow-lg" style={{ background: "#fdf3ee", borderColor: "#e8ddd5" }}>
                  <div className="relative aspect-square overflow-hidden">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "#f0e4da" }}>
                        <span className="text-4xl opacity-30">✨</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-serif font-semibold" style={{ color: "#3d2b1f" }}>{p.name}</p>
                    <p className="text-sm mt-1" style={{ color: "#8a6858" }}>Pièce unique · Fait main</p>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        )}

        <FadeIn>
          <div className="text-center mt-10">
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-8 py-3.5 border-2 font-medium rounded-full transition-all hover:bg-[#3d2b1f] hover:text-white text-sm"
              style={{ borderColor: "#3d2b1f", color: "#3d2b1f" }}
            >
              Voir toutes les créations <ArrowRight size={15} />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── PHOTOS SOUVENIRS polaroïd ── */}
      <PolaroidSection />

      {/* ── GRANDE CITATION ── */}
      <section style={{ background: "#fdf3ee", borderTop: "1px solid #e8ddd5", borderBottom: "1px solid #e8ddd5" }}>
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <FadeIn>
            <Heart size={24} className="mx-auto mb-8" style={{ color: "#c0826a" }} />
            <p className="font-serif text-2xl md:text-3xl italic leading-relaxed mb-8" style={{ color: "#3d2b1f" }}>
              &ldquo;Créer un bijou mémoriel, c&apos;est entrer dans l&apos;histoire de quelqu&apos;un.
              C&apos;est un honneur que je ne prends jamais à la légère.&rdquo;
            </p>
            <p className="text-sm font-medium" style={{ color: "#c0826a" }}>— Anaïs</p>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA CONTACT ── */}
      <section className="max-w-4xl mx-auto px-6 py-20 md:py-28">
        <div className="rounded-3xl p-10 md:p-14 text-center" style={{ background: "linear-gradient(135deg, #3d2b1f, #5a3e2e)" }}>
          <FadeIn>
            <p className="text-xs font-medium uppercase tracking-[0.2em] mb-4" style={{ color: "#c0826a" }}>Votre histoire mérite d&apos;être préservée</p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-white mb-5">
              Parlons de votre projet
            </h2>
            <p className="max-w-md mx-auto leading-relaxed mb-10" style={{ color: "#c8b49a" }}>
              Vous avez un souvenir à préserver ? Un projet qui vous tient à cœur ?
              Écrivez-moi — je serai ravie d&apos;échanger avec vous et de créer quelque chose d&apos;unique ensemble.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="flex items-center justify-center gap-2 px-8 py-4 font-medium rounded-full transition-all text-sm"
                style={{ background: "#c0826a", color: "white" }}
              >
                <Mail size={15} /> Me contacter
              </Link>
              <Link
                href="/catalogue"
                className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors text-sm"
              >
                Voir les créations <ArrowRight size={15} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

    </div>
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
          el.style.transition = `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0, transform: "translateY(28px)" }}>
      {children}
    </div>
  );
}
