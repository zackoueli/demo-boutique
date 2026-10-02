"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { CONSENT_EVENT } from "./analytics";

// Sans Google Analytics configuré, le site ne dépose aucun cookie de mesure
const HAS_AUDIENCE_COOKIES = Boolean(process.env.NEXT_PUBLIC_GA_ID);

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-brown text-cream rounded-2xl shadow-2xl border border-brown-mid p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie size={22} className="text-terra-light flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-cream/80 leading-relaxed flex-1">
          {HAS_AUDIENCE_COOKIES
            ? "Ce site utilise des cookies techniques (session, panier) et, avec votre accord, des cookies de mesure d'audience Google Analytics. Aucun cookie publicitaire."
            : "Ce site utilise uniquement des cookies techniques nécessaires à son fonctionnement (session, panier). Aucun cookie publicitaire."}{" "}
          <Link href="/confidentialite" className="text-terra-light hover:text-cream underline underline-offset-2 transition-colors">
            En savoir plus
          </Link>
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="p-2 text-cream/50 hover:text-cream transition-colors"
            aria-label="Refuser"
          >
            <X size={16} />
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 bg-terracotta hover:bg-terra-light text-cream text-sm font-medium rounded-xl transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
