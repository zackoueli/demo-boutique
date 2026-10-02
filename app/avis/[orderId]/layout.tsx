import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donner mon avis",
  robots: { index: false, follow: false },
};

export default function AvisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
