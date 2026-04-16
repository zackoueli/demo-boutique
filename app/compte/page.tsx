"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { Package, LogOut } from "lucide-react";
import { OrderCardSkeleton } from "@/app/ui/skeletons";
import InvoiceButton from "@/app/ui/invoice-button";

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

export default function ComptePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/connexion");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "orders"), where("userId", "==", user.uid)))
      .then((snap) => {
        const data = snap.docs.map((d) => d.data() as Order);
        // tri côté client pour éviter l'index composite Firestore
        data.sort((a, b) => {
          const ta = (a.createdAt as unknown as { seconds: number })?.seconds ?? 0;
          const tb = (b.createdAt as unknown as { seconds: number })?.seconds ?? 0;
          return tb - ta;
        });
        setOrders(data);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [user]);

  if (authLoading) return (
    <div className="bg-cream min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-terracotta rounded-full animate-spin" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-10 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-brown">Mon compte</h1>
            <p className="text-sm text-brown-light mt-1">
              {profile?.displayName && <span className="font-medium text-brown-mid">{profile.displayName} · </span>}
              {user.email}
            </p>
          </div>
          <button onClick={() => logOut().then(() => router.push("/"))}
            className="flex items-center gap-2 text-sm text-brown-light hover:text-terracotta transition-colors">
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h2 className="font-serif font-semibold text-brown text-xl mb-6 flex items-center gap-2">
          <Package size={18} className="text-brown-light" /> Mes commandes
        </h2>

        {loadingOrders ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-brown-light">
            <Package size={40} className="mx-auto mb-4 text-parchment" />
            <p className="font-serif text-lg">Aucune commande pour l&apos;instant.</p>
            <Link href="/catalogue" className="mt-3 inline-block text-sm text-terracotta hover:text-terra-light font-medium">
              Découvrir notre collection →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => (
              <div key={i} className="border border-border rounded-2xl p-5 bg-cream">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono text-brown-light">{order.id}</p>
                    <p className="text-sm text-brown-light mt-0.5">{order.items.length} article{order.items.length > 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span className="font-semibold text-terracotta">{formatPrice(order.total)}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-brown-light">
                  {order.items.map((item, idx) => (
                    <div key={`${item.productId}-${idx}`}>
                      <span>{item.name} × {item.quantity}</span>
                      {item.customizationLabels && Object.keys(item.customizationLabels).length > 0 && (
                        <span className="ml-2 inline-flex flex-wrap gap-1">
                          {Object.entries(item.customizationLabels).map(([label, value]) => (
                            <span key={label} className="text-xs bg-sand border border-border rounded px-1.5 py-0.5 text-brown-mid">
                              {label} : {value}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <InvoiceButton order={order} variant="outline" className="text-xs py-1.5 px-3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
