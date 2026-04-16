import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description: "Conditions générales de vente de Histoire Éternelle L'Atelier.",
};

export default function CGVPage() {
  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">Informations</p>
          <h1 className="font-serif text-3xl font-semibold text-brown">Conditions Générales de Vente</h1>
          <p className="text-sm text-brown-light mt-2">En vigueur au 1er janvier {new Date().getFullYear()}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-sm text-brown-light leading-relaxed">

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) s&apos;appliquent à toutes les ventes conclues sur le site
            <strong className="text-brown"> histoire-eternelle-l-atelier.fr</strong> entre Histoire Eternelle - L&apos;Atelier d&apos;Anaïs et
            tout client (particulier ou professionnel) souhaitant effectuer un achat.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">2. Produits</h2>
          <p>
            Les bijoux proposés à la vente sont décrits avec la plus grande précision possible. Les photographies
            sont aussi fidèles que possible mais ne peuvent garantir une parfaite similitude avec le produit, notamment
            en ce qui concerne les couleurs qui peuvent varier selon votre écran. Chaque bijou est artisanal et peut
            présenter de légères variations, ce qui est inhérent au caractère fait-main de nos créations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">3. Prix</h2>
          <p>
            Les prix sont indiqués en euros toutes taxes comprises (TTC). Histoire Eternelle - L&apos;Atelier d&apos;Anaïs se réserve
            le droit de modifier ses prix à tout moment. Les produits sont facturés au tarif en vigueur au moment
            de la validation de la commande.
          </p>
          <p>
            Les frais de livraison sont indiqués séparément lors de la commande. La livraison est offerte à partir
            de <strong className="text-brown">80 €</strong> d&apos;achat.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">4. Commande</h2>
          <p>
            La commande est validée après confirmation du paiement. Un email de confirmation récapitulant les
            détails de votre commande vous est envoyé automatiquement. Histoire Eternelle - L&apos;Atelier d&apos;Anaïs se réserve
            le droit d&apos;annuler toute commande en cas de rupture de stock ou d&apos;erreur manifeste de prix, après
            en avoir informé le client.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">5. Paiement</h2>
          <p>
            Le paiement s&apos;effectue en ligne par carte bancaire (Visa, Mastercard). Les données bancaires sont
            transmises de manière sécurisée. Le débit a lieu au moment de la validation de la commande.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">6. Livraison</h2>
          <p>
            Les commandes sont expédiées dans un délai de <strong className="text-brown">2 à 5 jours ouvrés</strong> après
            réception du paiement. Les délais de livraison sont donnés à titre indicatif et peuvent varier.
          </p>
          <p>
            En cas de retard d&apos;expédition, nous vous en informons par email. Histoire Eternelle - L&apos;Atelier d&apos;Anaïs ne
            saurait être tenu responsable de retards imputables au transporteur.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">7. Droit de rétractation</h2>
          <p>
            Conformément à l&apos;article L221-18 du Code de la consommation, vous disposez d&apos;un délai de{" "}
            <strong className="text-brown">14 jours</strong> à compter de la réception de votre commande pour exercer
            votre droit de rétractation, sans avoir à justifier de motifs.
          </p>
          <p>
            <strong className="text-brown">Exception :</strong> Les bijoux personnalisés (gravure, personnalisation sur mesure)
            sont exclus du droit de rétractation conformément à l&apos;article L221-28 du Code de la consommation.
          </p>
          <p>
            Pour exercer ce droit, contactez-nous par email à{" "}
            <a href="mailto:contact@histoire-eternelle-l-atelier.fr" className="text-terracotta hover:underline">
              contact@histoire-eternelle-l-atelier.fr
            </a>{" "}
            avant l&apos;expiration du délai.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">8. Retours et remboursements</h2>
          <p>
            Les produits retournés doivent être dans leur état d&apos;origine, non portés, non transformés, avec leur
            emballage d&apos;origine. Les frais de retour sont à la charge du client sauf en cas d&apos;erreur de notre part.
          </p>
          <p>
            Le remboursement est effectué dans un délai de <strong className="text-brown">14 jours</strong> suivant
            la réception du retour, par le même moyen de paiement que celui utilisé lors de l&apos;achat.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">9. Garanties</h2>
          <p>
            Tous nos produits bénéficient de la garantie légale de conformité (2 ans) et de la garantie contre les
            vices cachés, conformément aux articles L217-4 et suivants du Code de la consommation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">10. Droit applicable</h2>
          <p>
            Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera
            recherchée en priorité. À défaut, les tribunaux français seront seuls compétents.
          </p>
        </section>

        <div className="pt-4 border-t border-border flex gap-6">
          <Link href="/" className="text-sm text-terracotta hover:text-terra-light transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <Link href="/confidentialite" className="text-sm text-terracotta hover:text-terra-light transition-colors">
            Politique de confidentialité →
          </Link>
        </div>
      </div>
    </div>
  );
}
