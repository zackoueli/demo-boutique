import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité et protection des données personnelles de Histoire Éternelle L'Atelier.",
};

export default function ConfidentialitePage() {
  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">RGPD</p>
          <h1 className="font-serif text-3xl font-semibold text-brown">Politique de confidentialité</h1>
          <p className="text-sm text-brown-light mt-2">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10 text-sm text-brown-light leading-relaxed">

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement de vos données personnelles est <strong className="text-brown">Histoire Eternelle - L&apos;Atelier d&apos;Anaïs</strong>.
            Pour toute question relative à vos données, contactez-nous à{" "}
            <a href="mailto:contact@histoire-eternelle-l-atelier.fr" className="text-terracotta hover:underline">
              contact@histoire-eternelle-l-atelier.fr
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong className="text-brown-mid">Compte client :</strong> adresse email, nom d&apos;affichage</li>
            <li><strong className="text-brown-mid">Commandes :</strong> nom, adresse de livraison, email, 4 derniers chiffres de la carte bancaire</li>
            <li><strong className="text-brown-mid">Navigation :</strong> données techniques (adresse IP, navigateur) via Firebase</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">3. Finalités du traitement</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-sand text-brown-mid text-left">
                  <th className="px-4 py-2 font-semibold rounded-tl-xl">Finalité</th>
                  <th className="px-4 py-2 font-semibold">Base légale</th>
                  <th className="px-4 py-2 font-semibold rounded-tr-xl">Durée de conservation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Gestion des commandes", "Exécution du contrat", "5 ans (obligation légale)"],
                  ["Envoi d'emails de confirmation", "Exécution du contrat", "Durée de la relation commerciale"],
                  ["Gestion du compte client", "Consentement", "Jusqu'à suppression du compte"],
                  ["Amélioration du site", "Intérêt légitime", "13 mois maximum"],
                ].map(([f, b, d]) => (
                  <tr key={f} className="hover:bg-parchment/30">
                    <td className="px-4 py-2.5 text-brown-mid">{f}</td>
                    <td className="px-4 py-2.5">{b}</td>
                    <td className="px-4 py-2.5">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">4. Partage des données</h2>
          <p>Vos données peuvent être transmises aux prestataires suivants, dans le cadre strict de leur mission :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong className="text-brown-mid">Firebase (Google) :</strong> stockage des données et authentification</li>
            <li><strong className="text-brown-mid">Resend :</strong> envoi des emails transactionnels</li>
            <li><strong className="text-brown-mid">Vercel :</strong> hébergement du site</li>
            <li><strong className="text-brown-mid">Transporteurs :</strong> adresse de livraison transmise pour l&apos;expédition</li>
          </ul>
          <p>Aucune donnée n&apos;est vendue ou cédée à des tiers à des fins commerciales.</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">5. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong className="text-brown-mid">Droit d&apos;accès :</strong> obtenir une copie de vos données</li>
            <li><strong className="text-brown-mid">Droit de rectification :</strong> corriger des données inexactes</li>
            <li><strong className="text-brown-mid">Droit à l&apos;effacement :</strong> supprimer vos données</li>
            <li><strong className="text-brown-mid">Droit à la portabilité :</strong> recevoir vos données dans un format lisible</li>
            <li><strong className="text-brown-mid">Droit d&apos;opposition :</strong> vous opposer à un traitement</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à{" "}
            <a href="mailto:contact@histoire-eternelle-l-atelier.fr" className="text-terracotta hover:underline">
              contact@histoire-eternelle-l-atelier.fr
            </a>. Vous disposez également du droit d&apos;introduire une réclamation auprès de la{" "}
            <strong className="text-brown-mid">CNIL</strong> (cnil.fr).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold text-brown">6. Cookies</h2>
          <p>
            Ce site utilise uniquement des cookies techniques nécessaires au fonctionnement du site (session,
            authentification). Aucun cookie publicitaire ou de suivi tiers n&apos;est utilisé.
          </p>
        </section>

        <div className="pt-4 border-t border-border flex gap-6">
          <Link href="/" className="text-sm text-terracotta hover:text-terra-light transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <Link href="/cgv" className="text-sm text-terracotta hover:text-terra-light transition-colors">
            Voir les CGV →
          </Link>
        </div>
      </div>
    </div>
  );
}
