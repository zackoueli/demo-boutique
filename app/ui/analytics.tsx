"use client";

import { useEffect, useSyncExternalStore } from "react";
import Script from "next/script";
import { track } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** Émis par le bandeau cookies quand le visiteur accepte ou refuse */
export const CONSENT_EVENT = "cookie-consent-change";

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem("cookie-consent") === "accepted";
  } catch {
    return false;
  }
}

export default function Analytics() {
  const consented = useSyncExternalStore(subscribe, hasConsent, () => false);

  // Compteur anonyme du tunnel de vente (sans cookie) : première étape, la visite
  useEffect(() => {
    track("visit");
  }, []);

  // Google Analytics n'est chargé que s'il est configuré et que le visiteur l'a accepté
  if (!GA_ID || !consented) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
