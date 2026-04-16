import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-sand mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <p className="font-serif text-lg font-semibold text-brown mb-3">Histoire Eternelle - L&apos;Atelier d&apos;Anaïs</p>
          <p className="text-sm text-brown-light leading-relaxed max-w-56">
            Des bijoux artisanaux façonnés à la main, pour célébrer chaque moment qui compte.
          </p>
          <Link href="/a-propos" className="inline-block mt-4 text-xs text-terracotta hover:text-terra-light transition-colors font-medium">
            Notre histoire →
          </Link>
        </div>
        <div>
          <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-4">Catalogue</p>
          <ul className="space-y-2 text-sm text-brown-light">
            <li><Link href="/catalogue?category=rings" className="hover:text-terracotta transition-colors">Bagues</Link></li>
            <li><Link href="/catalogue?category=necklaces" className="hover:text-terracotta transition-colors">Colliers</Link></li>
            <li><Link href="/catalogue?category=bracelets" className="hover:text-terracotta transition-colors">Bracelets</Link></li>
            <li><Link href="/catalogue?category=earrings" className="hover:text-terracotta transition-colors">Boucles d&apos;oreilles</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-4">Mon espace</p>
          <ul className="space-y-2 text-sm text-brown-light">
            <li><Link href="/compte" className="hover:text-terracotta transition-colors">Mon compte</Link></li>
            <li><Link href="/panier" className="hover:text-terracotta transition-colors">Mon panier</Link></li>
            <li><Link href="/messages" className="hover:text-terracotta transition-colors">Mes messages</Link></li>
            <li><Link href="/contact" className="hover:text-terracotta transition-colors">Nous contacter</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-4">Informations</p>
          <ul className="space-y-2 text-sm text-brown-light">
            <li><Link href="/a-propos" className="hover:text-terracotta transition-colors">À propos</Link></li>
            <li><Link href="/cgv" className="hover:text-terracotta transition-colors">CGV</Link></li>
            <li><Link href="/mentions-legales" className="hover:text-terracotta transition-colors">Mentions légales</Link></li>
            <li><Link href="/confidentialite" className="hover:text-terracotta transition-colors">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-brown-light space-y-1">
        <p>© {new Date().getFullYear()} Histoire Eternelle - L&apos;Atelier d&apos;Anaïs — Créations artisanales</p>
        <p>Site créé par <a href="https://breizhapp.tech" target="_blank" rel="noopener noreferrer" className="hover:text-terracotta transition-colors">BreizhApp</a></p>
      </div>
    </footer>
  );
}
