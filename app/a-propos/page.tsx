import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart, Gem, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Notre histoire",
  description: "Découvrez l'histoire de Histoire Éternelle L'Atelier, bijoux artisanaux façonnés à la main.",
};

export default function AProposPage() {
  return (
    <div className="bg-cream min-h-screen">

      {/* Hero */}
      <section className="bg-sand border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.2em] mb-4">Notre histoire</p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-brown leading-tight mb-6">
            L&apos;atelier où chaque bijou<br />
            <em className="text-terracotta not-italic">raconte une histoire</em>
          </h1>
          <p className="text-brown-light leading-relaxed max-w-xl mx-auto text-base">
            Histoire Eternelle - L&apos;Atelier d&apos;Anaïs est né d&apos;une passion pour l&apos;artisanat d&apos;art et du désir de créer
            des pièces uniques qui traversent le temps.
          </p>
        </div>
      </section>

      {/* Histoire */}
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-8">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5 text-brown-light leading-relaxed">
            <h2 className="font-serif text-2xl font-semibold text-brown">Une passion devenue métier</h2>
            <p>
              Tout a commencé par une fascination pour les matières nobles, les formes organiques et
              la transmission d&apos;émotions à travers les objets. Chaque bijou créé dans l&apos;atelier est
              le fruit d&apos;heures de travail minutieux, de choix réfléchis sur les matériaux, et d&apos;un
              soin apporté à chaque détail.
            </p>
            <p>
              Ici, pas de production industrielle. Chaque pièce est unique, pensée pour durer et
              devenir le témoignage d&apos;un moment fort de votre vie.
            </p>
          </div>
          <div className="bg-sand rounded-3xl aspect-square flex items-center justify-center">
            <div className="text-center text-brown-light space-y-3">
              <Gem size={48} className="mx-auto text-terracotta/40" />
              <p className="text-xs font-medium uppercase tracking-widest text-brown-light/60">Photo de l&apos;atelier</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="bg-sand rounded-3xl aspect-square flex items-center justify-center md:order-first order-last">
            <div className="text-center text-brown-light space-y-3">
              <Sparkles size={48} className="mx-auto text-terracotta/40" />
              <p className="text-xs font-medium uppercase tracking-widest text-brown-light/60">Portrait de la créatrice</p>
            </div>
          </div>
          <div className="space-y-5 text-brown-light leading-relaxed">
            <h2 className="font-serif text-2xl font-semibold text-brown">Des matériaux choisis avec soin</h2>
            <p>
              L&apos;atelier travaille exclusivement avec des matériaux de qualité : or, argent, pierres
              naturelles et semi-précieuses sourcées de manière responsable. Chaque matière est
              sélectionnée pour sa beauté, sa durabilité et son caractère.
            </p>
            <p>
              Parce qu&apos;un bijou doit pouvoir se transmettre de génération en génération, nous ne faisons
              aucun compromis sur la qualité.
            </p>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="bg-sand border-t border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-14">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2 text-center">Nos engagements</p>
          <h2 className="font-serif text-2xl font-semibold text-brown text-center mb-10">Ce qui nous guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { icon: "🤲", title: "100% fait main", desc: "Chaque bijou est façonné à la main dans notre atelier, du début à la fin." },
              { icon: "🌿", title: "Matériaux nobles", desc: "Or, argent et pierres naturelles soigneusement sélectionnés à la source." },
              { icon: "♾️", title: "Pièces éternelles", desc: "Conçus pour durer et se transmettre, nos bijoux défient le temps." },
            ].map((v) => (
              <div key={v.title} className="flex flex-col items-center gap-3">
                <span className="text-4xl">{v.icon}</span>
                <p className="font-serif font-semibold text-brown text-lg">{v.title}</p>
                <p className="text-sm text-brown-light leading-relaxed max-w-52">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Heart size={32} className="mx-auto text-terracotta mb-5" />
        <h2 className="font-serif text-2xl font-semibold text-brown mb-4">
          Envie d&apos;une pièce unique ?
        </h2>
        <p className="text-brown-light mb-8 max-w-md mx-auto">
          Découvrez nos collections ou contactez-nous pour une création personnalisée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/catalogue"
            className="flex items-center justify-center gap-2 px-7 py-3.5 bg-brown text-cream font-medium rounded-full hover:bg-brown-mid transition-colors text-sm"
          >
            Voir la collection <ArrowRight size={15} />
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2 px-7 py-3.5 border border-border text-brown-mid font-medium rounded-full hover:bg-sand transition-colors text-sm"
          >
            Nous contacter
          </Link>
        </div>
      </section>
    </div>
  );
}
