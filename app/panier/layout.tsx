import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon panier",
  description: "Votre panier Histoire Eternelle - L'Atelier d'Anaïs.",
  robots: { index: false },
};

export default function PanierLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
