import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Découvrez notre collection de bijoux mémoriels artisanaux : bagues, colliers, bracelets et boucles d'oreilles façonnés à la main.",
  openGraph: {
    title: "Catalogue — Histoire Eternelle - L'Atelier d'Anaïs",
    description: "Bijoux mémoriels artisanaux façonnés à la main. Bagues, colliers, bracelets, boucles d'oreilles.",
    type: "website",
  },
};

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
