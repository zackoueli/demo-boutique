import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos — Anaïs",
  description: "Découvrez l'histoire d'Anaïs, créatrice de bijoux en résine en Bretagne pour préserver vos moments précieux.",
};

export default function AProposLayout({ children }: { children: React.ReactNode }) {
  return children;
}
