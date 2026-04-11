import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catalogue — Bijoux & Co",
  description: "Découvrez notre collection de bijoux artisanaux : bagues, colliers, bracelets et boucles d'oreilles façonnés à la main.",
  openGraph: {
    title: "Catalogue — Bijoux & Co",
    description: "Bijoux artisanaux façonnés à la main. Bagues, colliers, bracelets, boucles d'oreilles.",
    type: "website",
  },
};

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
