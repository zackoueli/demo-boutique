"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { ShoppingBag, User, LogOut, Shield, Heart, MessageSquare } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-context";
import { useState } from "react";
import SearchBar from "./search-bar";

export default function Navbar() {
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { user, profile, logOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-border">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" className="font-serif text-xl font-semibold tracking-wide text-brown truncate min-w-0 max-w-[40vw] md:max-w-none">
          Histoire Eternelle - L&apos;Atelier d&apos;Anaïs
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-brown-mid">
          <Link href="/" className="hover:text-brown transition-colors">Accueil</Link>
          <Link href="/catalogue" className="hover:text-brown transition-colors">Catalogue</Link>
          <Link href="/a-propos" className="hover:text-brown transition-colors">À propos</Link>
          <Link href="/contact" className="hover:text-brown transition-colors">Contact</Link>
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-1 text-terracotta hover:text-terra-light transition-colors">
              <Shield size={13} />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SearchBar />
          <Link href="/souhaits" className="relative p-2.5 rounded-full hover:bg-sand transition-colors" aria-label="Mes favoris">
            <Heart size={19} className="text-brown-mid" />
            {wishCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-terracotta text-cream text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                {wishCount}
              </span>
            )}
          </Link>
          <Link
            href="/panier"
            className="relative p-2.5 rounded-full hover:bg-sand transition-colors"
          >
            <ShoppingBag size={19} className="text-brown-mid" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-terracotta text-cream text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-sand transition-colors"
              >
                <User size={19} className="text-brown-mid" />
                <span className="hidden md:block text-sm text-brown-mid max-w-24 truncate">
                  {profile?.displayName || user.email}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-cream border border-border rounded-2xl shadow-lg py-1.5 z-50">
                  <Link
                    href="/compte"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-brown-mid hover:bg-sand hover:text-brown transition-colors"
                  >
                    <User size={14} /> Mon compte
                  </Link>
                  <Link
                    href="/messages"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-brown-mid hover:bg-sand hover:text-brown transition-colors"
                  >
                    <MessageSquare size={14} /> Mes messages
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-terracotta hover:bg-sand transition-colors"
                    >
                      <Shield size={14} /> Administration
                    </Link>
                  )}
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => { logOut(); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-brown-mid hover:bg-sand hover:text-brown transition-colors"
                  >
                    <LogOut size={14} /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/connexion"
              className="px-5 py-2 text-sm font-medium text-cream bg-brown rounded-full hover:bg-brown-mid transition-colors"
            >
              Connexion
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
