import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de Histoire Éternelle L'Atelier.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">Informations</p>
          <h1 className="font-serif text-3xl font-semibold text-brown">Mentions légales</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-sm text-brown-light leading-relaxed">

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">Éditeur du site</h2>
          <p>Le site <strong className="text-brown">histoire-eternelle-l-atelier.fr</strong> est édité par :</p>
          <div className="bg-sand rounded-2xl p-5 space-y-1 text-brown-mid">
            <p><strong>Histoire Eternelle - L&apos;Atelier d&apos;Anaïs</strong></p>
            <p>Forme juridique : [À compléter — ex : Auto-entrepreneur / SASU]</p>
            <p>SIRET : [À compléter]</p>
            <p>Adresse : [À compléter]</p>
            <p>Email : <a href="mailto:contact@histoire-eternelle-l-atelier.fr" className="text-terracotta hover:underline">contact@histoire-eternelle-l-atelier.fr</a></p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">Hébergement</h2>
          <div className="bg-sand rounded-2xl p-5 space-y-1 text-brown-mid">
            <p><strong>Vercel Inc.</strong></p>
            <p>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>
            <p>Site : <span className="text-terracotta">vercel.com</span></p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble du contenu de ce site (textes, images, visuels, logos) est la propriété exclusive de
            Histoire Eternelle - L&apos;Atelier d&apos;Anaïs et est protégé par les lois françaises et internationales relatives
            à la propriété intellectuelle. Toute reproduction, représentation ou diffusion, en tout ou partie,
            est interdite sans autorisation préalable écrite.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">Responsabilité</h2>
          <p>
            Histoire Eternelle - L&apos;Atelier d&apos;Anaïs s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations
            diffusées sur ce site. Toutefois, des erreurs ou omissions peuvent survenir. L&apos;éditeur ne saurait
            être tenu responsable de l&apos;utilisation faite de ces informations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">Données personnelles</h2>
          <p>
            Pour toute information relative au traitement de vos données personnelles, consultez notre{" "}
            <Link href="/confidentialite" className="text-terracotta hover:underline">politique de confidentialité</Link>.
          </p>
        </section>

        <div className="pt-4 border-t border-border">
          <Link href="/" className="text-sm text-terracotta hover:text-terra-light transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
