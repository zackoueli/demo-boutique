"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { LayoutDashboard, Package, ShoppingCart, Shield, Tag } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/promos", label: "Codes promo", icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace("/connexion");
  }, [user, isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-terracotta rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-56 bg-brown text-cream flex-shrink-0 flex flex-col">
        <div className="px-6 py-5 border-b border-brown-mid">
          <div className="flex items-center gap-2 text-terra-light">
            <Shield size={15} />
            <span className="font-serif font-semibold text-sm tracking-wide">Administration</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-brown-mid text-cream"
                    : "text-cream/60 hover:bg-brown-mid/50 hover:text-cream"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t border-brown-mid">
          <Link href="/" className="text-xs text-cream/40 hover:text-cream/70 transition-colors">
            ← Retour à la boutique
          </Link>
        </div>
      </aside>

      {/* Contenu */}
      <div className="flex-1 bg-cream overflow-auto">
        {children}
      </div>
    </div>
  );
}
