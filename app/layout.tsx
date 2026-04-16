import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import Providers from "./ui/providers";
import Navbar from "./ui/navbar";
import Footer from "./ui/footer";
import CookieBanner from "./ui/cookie-banner";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Histoire Eternelle - L'Atelier d'Anaïs — Bijoux artisanaux",
    template: "%s — Histoire Eternelle - L'Atelier d'Anaïs",
  },
  description: "Histoire Eternelle - L'Atelier d'Anaïs — Bijoux artisanaux façonnés à la main. Bagues, colliers, bracelets et boucles d'oreilles en matériaux nobles. Pièces uniques pour célébrer chaque moment.",
  keywords: ["bijoux", "artisanal", "bague", "collier", "bracelet", "boucles d'oreilles", "fait main", "or", "argent"],
  openGraph: {
    title: "Histoire Eternelle - L'Atelier d'Anaïs — Bijoux artisanaux",
    description: "Pièces uniques façonnées à la main avec des matériaux nobles.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-brown font-sans">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
