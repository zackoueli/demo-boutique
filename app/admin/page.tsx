"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Package, ShoppingCart, TrendingUp } from "lucide-react";

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "En attente", processing: "En préparation", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};
const STATUS_COLORS: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ordersSnap, productsSnap, recentSnap] = await Promise.all([
          getDocs(collection(db, "orders")),
          getDocs(collection(db, "products")),
          getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(5))),
        ]);
        const allOrders = ordersSnap.docs.map((d) => d.data() as Order);
        setStats({ orders: allOrders.length, revenue: allOrders.reduce((s, o) => s + o.total, 0), products: productsSnap.size });
        setRecentOrders(recentSnap.docs.map((d) => d.data() as Order));
      } catch { /* */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Espace admin</p>
        <h1 className="font-serif text-2xl font-semibold text-brown">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Commandes" value={loading ? "…" : String(stats.orders)} icon={ShoppingCart} accent="text-blue-600 bg-blue-50" />
        <StatCard label="Chiffre d'affaires" value={loading ? "…" : formatPrice(stats.revenue)} icon={TrendingUp} accent="text-terracotta bg-terra-pale" />
        <StatCard label="Produits" value={loading ? "…" : String(stats.products)} icon={Package} accent="text-green-700 bg-green-50" />
      </div>

      {/* Dernières commandes */}
      <div className="bg-sand border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-serif font-semibold text-brown">Dernières commandes</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-parchment rounded-xl animate-pulse" />)}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="py-14 text-center text-brown-light text-sm">Aucune commande pour l&apos;instant.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="text-xs text-brown-light uppercase bg-parchment/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left">Référence</th>
                <th className="px-6 py-3 text-left">Client</th>
                <th className="px-6 py-3 text-left">Statut</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map((order, i) => (
                <tr key={i} className="hover:bg-parchment/30 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-brown-light">{order.id}</td>
                  <td className="px-6 py-3 text-brown-mid">{order.userEmail}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-terracotta">{formatPrice(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent: string }) {
  return (
    <div className="bg-sand border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-brown-light">{label}</p>
        <p className="text-2xl font-bold text-brown mt-0.5">{value}</p>
      </div>
    </div>
  );
}
