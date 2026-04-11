import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon panier — Bijoux & Co",
  description: "Votre panier Bijoux & Co.",
};

export default function PanierLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
