"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { LayoutDashboard, Package, ShoppingCart, Shield, Tag, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/promos", label: "Codes promo", icon: Tag },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

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
      <aside className={`${collapsed ? "w-14" : "w-56"} bg-brown text-cream flex-shrink-0 flex flex-col transition-all duration-200 relative`}>
        {/* Header */}
        <div className={`px-3 py-5 border-b border-brown-mid flex items-center ${collapsed ? "justify-center" : "justify-between px-6"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 text-terra-light">
              <Shield size={15} />
              <span className="font-serif font-semibold text-sm tracking-wide">Administration</span>
            </div>
          )}
          {collapsed && <Shield size={15} className="text-terra-light" />}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`p-1 rounded-lg text-cream/50 hover:text-cream hover:bg-brown-mid/50 transition-colors ${collapsed ? "mt-0" : ""}`}
            title={collapsed ? "Agrandir le menu" : "Réduire le menu"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-brown-mid text-cream"
                    : "text-cream/60 hover:bg-brown-mid/50 hover:text-cream"
                }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        <div className={`px-3 py-5 border-t border-brown-mid ${collapsed ? "flex justify-center" : "px-6"}`}>
          {collapsed ? (
            <Link href="/" title="Retour à la boutique" className="text-cream/40 hover:text-cream/70 transition-colors">
              <ChevronLeft size={15} />
            </Link>
          ) : (
            <Link href="/" className="text-xs text-cream/40 hover:text-cream/70 transition-colors">
              ← Retour à la boutique
            </Link>
          )}
        </div>
      </aside>

      {/* Contenu */}
      <div className="flex-1 bg-cream overflow-auto">
        {children}
      </div>
    </div>
  );
}
