import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-cream min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-serif text-8xl font-bold text-parchment select-none mb-6">404</p>
        <h1 className="font-serif text-2xl font-semibold text-brown mb-3">
          Cette page est introuvable
        </h1>
        <p className="text-brown-light leading-relaxed mb-8">
          Le bijou que vous cherchez a peut-être été déplacé ou n&apos;existe plus.
          Retournez à la boutique pour découvrir nos créations.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brown text-cream rounded-full font-medium hover:bg-brown-mid transition-colors text-sm"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/catalogue"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-border text-brown-mid rounded-full font-medium hover:bg-sand transition-colors text-sm"
          >
            Voir le catalogue <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
