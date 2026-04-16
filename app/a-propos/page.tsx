"use client";

import Link from "next/link";
import { ArrowRight, Heart, Gem, Shield } from "lucide-react";
import { useEffect, useRef } from "react";

export default function AProposPage() {
  return (
    <div style={{ background: "#fdf8f4" }} className="min-h-screen overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative min-h-[70vh] flex items-center" style={{ background: "linear-gradient(160deg, #3d2b1f 0%, #5a3e2e 50%, #7a5040 100%)" }}>
        {/* Cercles décoratifs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #c0826a, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #e8c4a8, transparent)", transform: "translate(-30%, 30%)" }} />

        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32">
          <FadeIn delay={0}>
            <p className="text-xs font-medium uppercase tracking-[0.3em] mb-6" style={{ color: "#c0826a" }}>
              Histoire Éternelle · L&apos;Atelier d&apos;Anaïs · Bretagne
            </p>
          </FadeIn>
          <FadeIn delay={100}>
            <h1 className="font-serif text-5xl md:text-6xl font-semibold text-white leading-[1.1] mb-8">
              Je préserve<br />
              <em className="not-italic" style={{ color: "#c0826a" }}>ce qui compte</em><br />
              vraiment.
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-lg max-w-xl leading-relaxed" style={{ color: "#c8b49a" }}>
              Maman de trois enfants, femme de militaire, artisane du cœur —
              je façonne en Bretagne des bijoux en résine qui gardent vos plus belles histoires vivantes pour toujours.
            </p>
          </FadeIn>
        </div>

        {/* Vague de transition */}
        <div className="absolute bottom-0 left-0 right-0" style={{ height: 60 }}>
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#fdf8f4" />
          </svg>
        </div>
      </section>

      {/* ── SON HISTOIRE ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <FadeIn>
            <div className="space-y-6 leading-relaxed" style={{ color: "#8a6858" }}>
              <p className="text-xs font-medium uppercase tracking-[0.2em]" style={{ color: "#c0826a" }}>Un peu de moi</p>
              <h2 className="font-serif text-3xl font-semibold" style={{ color: "#3d2b1f" }}>
                L&apos;histoire commence<br />avec trois maternités
              </h2>
              <p>
                Je m&apos;appelle Anaïs. Chacune de mes grossesses a été une transformation — pas seulement physique,
                mais profondément intérieure. Ces instants que l&apos;on voudrait retenir pour toujours :
                les premières heures, le regard d&apos;un nouveau-né, la douceur du lait maternel, les petites mains
                qui s&apos;agrippent.
              </p>
              <p>
                On sait qu&apos;ils sont là, intenses, bouleversants. Et on sait aussi qu&apos;ils vont passer.
                C&apos;est cette envie de <em>tenir le temps entre ses mains</em> qui est à l&apos;origine de tout.
              </p>
              <p>
                C&apos;est lors de ma troisième maternité que j&apos;ai découvert la résine. Sa capacité à figer le
                vivant m&apos;a immédiatement frappée : une mèche de cheveux, une goutte de lait, une fleur cueillie
                un matin de printemps — préservées pour toujours dans quelque chose de solide, de beau, d&apos;intemporel.
              </p>
              <p>
                J&apos;ai commencé à créer pour moi. Puis pour des amies. Puis pour des femmes qui me confiaient
                ce qu&apos;elles avaient de plus précieux : <strong style={{ color: "#3d2b1f" }}>un peu de leur histoire.</strong>
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="relative">
              {/* Grande citation visuelle */}
              <div className="rounded-3xl p-8 md:p-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #fdf3ee, #f5e6da)" }}>
                <div className="absolute top-4 left-6 font-serif text-8xl leading-none opacity-10 select-none" style={{ color: "#c0826a" }}>"</div>
                <p className="font-serif text-xl md:text-2xl italic leading-relaxed relative z-10 pt-6" style={{ color: "#3d2b1f" }}>
                  Je ne fabrique pas des bijoux.
                  Je préserve des émotions.
                </p>
                <p className="mt-6 text-sm font-medium" style={{ color: "#c0826a" }}>— Anaïs</p>
              </div>

              {/* Petits badges flottants */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-3 shadow-lg border flex items-center gap-2" style={{ borderColor: "#e8ddd5" }}>
                <span className="text-xl">🤱</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#3d2b1f" }}>Maman de 3</p>
                  <p className="text-xs" style={{ color: "#8a6858" }}>Femme de militaire</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl px-4 py-3 shadow-lg border flex items-center gap-2" style={{ borderColor: "#e8ddd5" }}>
                <span className="text-xl">📍</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#3d2b1f" }}>Bretagne</p>
                  <p className="text-xs" style={{ color: "#8a6858" }}>Fait à la main</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SES DEUX UNIVERS ── */}
      <section style={{ background: "#fdf3ee", borderTop: "1px solid #e8ddd5", borderBottom: "1px solid #e8ddd5" }}>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <FadeIn>
            <div className="text-center mb-14">
              <p className="text-xs font-medium uppercase tracking-[0.2em] mb-3" style={{ color: "#c0826a" }}>Mes deux univers</p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold" style={{ color: "#3d2b1f" }}>Mais alors, que fais-je ?</h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            <FadeIn delay={0}>
              <div className="rounded-3xl p-8 h-full flex flex-col gap-5" style={{ background: "white", border: "1px solid #e8ddd5" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "#fdf3ee" }}>
                  ✨
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.15em] mb-2" style={{ color: "#c0826a" }}>Premier univers</p>
                  <h3 className="font-serif text-2xl font-semibold mb-4" style={{ color: "#3d2b1f" }}>Les bijoux fantaisie</h3>
                  <p className="leading-relaxed" style={{ color: "#8a6858" }}>
                    Nés de ma fascination pour la douceur du quotidien : les couleurs de la nature, les textures
                    délicates, les petits éclats de lumière qui rendent une journée plus belle.
                  </p>
                </div>
                <p className="leading-relaxed mt-auto pt-4 border-t text-sm italic" style={{ color: "#c0826a", borderColor: "#e8ddd5" }}>
                  Chaque bijou fantaisie est une parenthèse poétique, un souffle de légèreté, une invitation
                  à se sentir belle et unique.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <div className="rounded-3xl p-8 h-full flex flex-col gap-5" style={{ background: "#3d2b1f" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.1)" }}>
                  ❤️
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.15em] mb-2" style={{ color: "#c0826a" }}>Deuxième univers</p>
                  <h3 className="font-serif text-2xl font-semibold mb-4 text-white">Les bijoux mémoriels</h3>
                  <p className="leading-relaxed" style={{ color: "#c8b49a" }}>
                    La partie la plus intime, la plus profonde de mon travail. Je ne crée pas seulement un bijou :
                    je transforme un fragment de vie en un objet précieux.
                  </p>
                </div>
                <div className="space-y-2 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  {["Lait maternel", "Mèches de cheveux", "Fleurs séchées", "Cendres", "Symboles personnels"].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full" style={{ background: "#c0826a" }} />
                      <span className="text-sm" style={{ color: "#c8b49a" }}>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm italic font-medium mt-auto" style={{ color: "#c0826a" }}>
                  « Créer un bijou mémoriel, c&apos;est entrer dans l&apos;histoire de quelqu&apos;un.
                  C&apos;est un honneur que je ne prends jamais à la légère. »
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── LA QUALITÉ ── */}
      <section style={{ background: "#fdf8f4" }}>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <FadeIn>
            <div className="text-center mb-14">
              <p className="text-xs font-medium uppercase tracking-[0.2em] mb-3" style={{ color: "#c0826a" }}>Mon engagement qualité</p>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold" style={{ color: "#3d2b1f" }}>Pourquoi mes créations<br />se distinguent ?</h2>
              <p className="mt-4 max-w-xl mx-auto leading-relaxed" style={{ color: "#8a6858" }}>
                J&apos;utilise une résine de qualité hautement supérieure, choisie avec soin selon l&apos;usage.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            <FadeIn delay={0}>
              <div className="rounded-3xl p-7 flex flex-col gap-4 h-full" style={{ background: "#fdf3ee", border: "1px solid #e8ddd5" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "white" }}>
                  <Gem size={20} style={{ color: "#c0826a" }} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "#c0826a" }}>Fantaisie</p>
                  <h3 className="font-serif text-lg font-semibold mb-2" style={{ color: "#3d2b1f" }}>Résine Resiners</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#8a6858" }}>
                    Une résine haut de gamme sélectionnée pour ses propriétés optiques exceptionnelles
                    et ses finitions cristallines.
                  </p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <div className="rounded-3xl p-7 flex flex-col gap-4 h-full relative overflow-hidden" style={{ background: "#3d2b1f" }}>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #c0826a, transparent)", transform: "translate(30%, -30%)" }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center relative z-10" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <Shield size={20} style={{ color: "#c0826a" }} />
                </div>
                <div className="relative z-10">
                  <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "#c0826a" }}>Mémoriel</p>
                  <h3 className="font-serif text-lg font-semibold mb-2 text-white">Résine ArtResin + HALS</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#c8b49a" }}>
                    Enrichie d&apos;un agent anti-jaunissement premium <strong className="text-white">HALS</strong> —
                    le meilleur sur le marché. Un blanc qui tient. Une durabilité exceptionnelle.
                  </p>
                </div>
                <div className="mt-auto relative z-10 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "rgba(192,130,106,0.2)", color: "#c0826a" }}>
                    Le meilleur du marché
                  </span>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <div className="rounded-3xl p-7 flex flex-col gap-4 h-full" style={{ background: "#fff0eb", border: "1px solid #e8ddd5" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: "white" }}>
                  🚫
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: "#c0826a" }}>Ma règle</p>
                  <h3 className="font-serif text-lg font-semibold mb-2" style={{ color: "#3d2b1f" }}>Jamais de résine UV</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#8a6858" }}>
                    Elle jaunit systématiquement au bout de quelque temps. Vos souvenirs méritent mieux.
                    Pas chez moi — jamais.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── SA PROMESSE ── */}
      <section style={{ background: "#3d2b1f" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, #c0826a, transparent)" }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, #e8c4a8, transparent)" }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <FadeIn>
            <Heart size={28} className="mx-auto mb-8" style={{ color: "#c0826a" }} />
            <p className="font-serif text-2xl md:text-3xl italic leading-relaxed mb-8 text-white">
              « Je me consacre à la création de bijoux artisanaux en résine, valorisant des souvenirs précieux
              comme le lait maternel, les mèches de cheveux, parfois les cendres… mais aussi des bijoux et accessoires
              plus colorés à base de fleurs, de paillettes. Chaque pièce est le reflet d&apos;histoires émouvantes
              et d&apos;émotions, façonnée avec soin en Bretagne pour offrir des créations uniques et personnalisées
              aux personnes qui me font confiance. »
            </p>
            <p className="text-sm font-medium" style={{ color: "#c0826a" }}>— Anaïs, fondatrice d&apos;Histoire Éternelle</p>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <FadeIn>
          <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4" style={{ color: "#3d2b1f" }}>
            Votre histoire mérite d&apos;être préservée
          </h2>
          <p className="mb-10 max-w-md mx-auto leading-relaxed" style={{ color: "#8a6858" }}>
            Découvrez les créations disponibles ou contactez-moi pour une pièce unique faite à partir de vos souvenirs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/catalogue"
              className="flex items-center justify-center gap-2 px-7 py-3.5 text-white font-medium rounded-full transition-all hover:opacity-90 text-sm"
              style={{ background: "#3d2b1f" }}
            >
              Voir les créations <ArrowRight size={15} />
            </Link>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 px-7 py-3.5 border font-medium rounded-full transition-all hover:bg-[#fdf3ee] text-sm"
              style={{ borderColor: "#c0826a", color: "#c0826a" }}
            >
              Me contacter
            </Link>
          </div>
        </FadeIn>
      </section>

    </div>
  );
}

/* ── Composant d'animation fade-in au scroll ── */
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transition = `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`;
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
    <div ref={ref} style={{ opacity: 0, transform: "translateY(24px)" }}>
      {children}
    </div>
  );
}
