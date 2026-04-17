"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ChevronDown, ChevronRight, Search, RefreshCw, Home, Store } from "lucide-react";
import InvoiceButton from "@/app/ui/invoice-button";

const STATUSES: Order["status"][] = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "En attente",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_COLORS: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<Order["status"], string> = {
  pending: "bg-amber-400",
  processing: "bg-blue-400",
  shipped: "bg-purple-400",
  delivered: "bg-green-500",
  cancelled: "bg-red-400",
};

type OrderWithDocId = Order & { docId: string };

export default function AdminCommandesPage() {
  const [orders, setOrders] = useState<OrderWithDocId[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const snap = await getDocs(collection(db, "orders"));
      const data = snap.docs.map((d) => ({ docId: d.id, ...d.data() } as OrderWithDocId));
      data.sort((a, b) => {
        const ta = (a.createdAt as unknown as { seconds: number })?.seconds ?? 0;
        const tb = (b.createdAt as unknown as { seconds: number })?.seconds ?? 0;
        return tb - ta;
      });
      setOrders(data);
    } catch { setOrders([]); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(docId: string, status: Order["status"]) {
    await updateDoc(doc(db, "orders", docId), { status });
    setOrders((prev) => prev.map((o) => o.docId === docId ? { ...o, status } : o));

    // Email de suivi au client (fire & forget)
    const order = orders.find((o) => o.docId === docId);
    if (order) {
      fetch("/api/send-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          userEmail: order.userEmail,
          fullName: order.shipping?.fullName ?? order.userEmail,
          status,
          total: order.total,
        }),
      }).catch(() => {});
    }
  }

  // Stats par statut
  const stats = useMemo(() => {
    const counts = {} as Record<Order["status"], number>;
    STATUSES.forEach((s) => { counts[s] = 0; });
    orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    return { counts, revenue };
  }, [orders]);

  // Filtrage
  const filtered = useMemo(() => {
    let list = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.userEmail?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.shipping?.fullName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filterStatus, search]);

  function formatDate(createdAt: unknown) {
    const ts = createdAt as { seconds: number } | null;
    if (!ts?.seconds) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  return (
    <div className="p-4 md:p-8">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Gestion</p>
          <h1 className="font-serif text-2xl font-semibold text-brown">Commandes</h1>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-brown-mid border border-border rounded-xl hover:bg-sand transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div
          onClick={() => setFilterStatus("all")}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${filterStatus === "all" ? "bg-brown text-cream border-brown" : "bg-sand border-border hover:border-brown-light"}`}
        >
          <p className={`text-2xl font-bold ${filterStatus === "all" ? "text-cream" : "text-brown"}`}>{orders.length}</p>
          <p className={`text-xs mt-0.5 ${filterStatus === "all" ? "text-cream/70" : "text-brown-light"}`}>Total</p>
        </div>
        {STATUSES.map((s) => (
          <div
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${filterStatus === s ? "ring-2 ring-brown" : "hover:border-brown-light"} bg-sand border-border`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
            </div>
            <p className="text-2xl font-bold text-brown">{stats.counts[s]}</p>
            <p className="text-xs text-brown-light mt-0.5 leading-tight">{STATUS_LABELS[s]}</p>
          </div>
        ))}
      </div>

      {/* CA */}
      <div className="bg-terra-pale border border-terracotta/20 rounded-2xl px-6 py-4 mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-widest">Chiffre d&apos;affaires (hors annulées)</p>
          <p className="font-serif text-2xl font-semibold text-brown mt-1">{formatPrice(stats.revenue)}</p>
        </div>
        <p className="text-sm text-brown-light">{orders.filter((o) => o.status !== "cancelled").length} commandes actives</p>
      </div>

      {/* Recherche */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-brown-light" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par email, référence ou nom…"
          className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition"
        />
      </div>

      {/* Résultat count */}
      {(filterStatus !== "all" || search) && (
        <p className="text-sm text-brown-light mb-4">
          {filtered.length} commande{filtered.length !== 1 ? "s" : ""}
          {filterStatus !== "all" && <span> · Filtre : <span className="font-medium text-brown">{STATUS_LABELS[filterStatus]}</span></span>}
          {search && <span> · Recherche : <span className="font-medium text-brown">&ldquo;{search}&rdquo;</span></span>}
          <button onClick={() => { setFilterStatus("all"); setSearch(""); }} className="ml-3 text-terracotta hover:text-terra-light text-xs underline underline-offset-2">
            Effacer
          </button>
        </p>
      )}

      {/* Liste */}
      <div className="bg-sand border border-border rounded-2xl overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-parchment rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-brown-light font-serif">
            {orders.length === 0 ? "Aucune commande pour l'instant." : "Aucun résultat pour cette recherche."}
          </div>
        ) : (
          <div className="divide-y divide-border min-w-[600px]">
            {filtered.map((order) => (
              <div key={order.docId}>
                {/* Ligne principale */}
                <div
                  className="flex items-center gap-3 px-5 py-4 hover:bg-parchment/30 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === order.docId ? null : order.docId)}
                >
                  <span className="text-brown-light flex-shrink-0">
                    {expanded === order.docId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>

                  {/* Infos client */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-brown truncate">{order.shipping?.fullName || order.userEmail}</p>
                    </div>
                    <p className="text-xs text-brown-light truncate">{order.userEmail}</p>
                  </div>

                  {/* Type livraison */}
                  <span className="hidden lg:flex flex-shrink-0" title={order.shipping?.type === "relay" ? "Point relais" : "Domicile"}>
                    {order.shipping?.type === "relay"
                      ? <Store size={14} className="text-purple-500" />
                      : <Home size={14} className="text-blue-400" />}
                  </span>

                  {/* Date */}
                  <p className="text-xs text-brown-light flex-shrink-0 hidden md:block">{formatDate(order.createdAt)}</p>

                  {/* Nb articles */}
                  <p className="text-xs text-brown-light flex-shrink-0 hidden lg:block">
                    {order.items?.length ?? 0} article{(order.items?.length ?? 0) > 1 ? "s" : ""}
                  </p>

                  {/* Statut badge */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>

                  {/* Total */}
                  <span className="font-semibold text-terracotta flex-shrink-0 text-sm w-20 text-right">
                    {formatPrice(order.total)}
                  </span>

                  {/* Sélecteur statut */}
                  <select
                    value={order.status}
                    onChange={(e) => { e.stopPropagation(); updateStatus(order.docId, e.target.value as Order["status"]); }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs border border-border rounded-xl px-2.5 py-2 text-brown-mid bg-cream focus:outline-none focus:ring-2 focus:ring-brown flex-shrink-0"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>

                {/* Détail dépliable */}
                {expanded === order.docId && (
                  <div className="px-12 py-6 bg-cream border-t border-border">
                    <div className="grid md:grid-cols-3 gap-6 text-sm">

                      {/* Articles */}
                      <div className="md:col-span-1">
                        <p className="font-serif font-semibold text-brown mb-3">Articles commandés</p>
                        <div className="space-y-3">
                          {order.items?.map((item, idx) => (
                            <div key={`${item.productId}-${idx}`} className="text-brown-mid">
                              <div className="flex justify-between">
                                <span className="truncate flex-1 pr-2">{item.name} × {item.quantity}</span>
                                <span className="flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                              {item.customizationLabels && Object.keys(item.customizationLabels).length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {Object.entries(item.customizationLabels).map(([label, value]) => (
                                    <span key={label} className="text-xs bg-terracotta/10 text-terracotta border border-terracotta/20 rounded px-1.5 py-0.5">
                                      {label} : {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold text-brown border-t border-border pt-2 mt-1">
                            <span>Total</span>
                            <span className="text-terracotta">{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Livraison */}
                      <div>
                        <p className="font-serif font-semibold text-brown mb-3">Livraison</p>

                        {/* Badge type de livraison */}
                        {order.shipping?.type === "relay" ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-medium mb-3">
                            <Store size={12} />
                            Point relais
                            {(order.shipping as { carrier?: string }).carrier && (
                              <span className="ml-1 font-semibold">· {(order.shipping as { carrier?: string }).carrier}</span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-3">
                            <Home size={12} />
                            Domicile
                          </div>
                        )}

                        {/* Nom du point relais si applicable */}
                        {order.shipping?.type === "relay" && (order.shipping as { relayPoint?: { name: string } }).relayPoint && (
                          <p className="text-sm font-semibold text-brown mb-1">
                            {(order.shipping as { relayPoint?: { name: string } }).relayPoint!.name}
                          </p>
                        )}

                        <address className="not-italic text-brown-mid space-y-1 leading-relaxed text-sm">
                          <p className="font-medium text-brown">{order.shipping?.fullName}</p>
                          <p>{order.shipping?.address}</p>
                          <p>{order.shipping?.postalCode} {order.shipping?.city}</p>
                          <p>{order.shipping?.country}</p>
                        </address>

                        {/* Horaires du point relais */}
                        {order.shipping?.type === "relay" && (order.shipping as { relayPoint?: { hours?: string } }).relayPoint?.hours && (
                          <p className="text-xs text-brown-light mt-2 italic">
                            {(order.shipping as { relayPoint?: { hours?: string } }).relayPoint!.hours}
                          </p>
                        )}
                      </div>

                      {/* Paiement & meta */}
                      <div>
                        <p className="font-serif font-semibold text-brown mb-3">Informations</p>
                        <div className="space-y-2 text-brown-mid">
                          <div className="flex justify-between">
                            <span>Paiement</span>
                            <span className="font-medium">{order.payment?.method} ···· {order.payment?.last4}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Date</span>
                            <span className="font-medium">{formatDate(order.createdAt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Email</span>
                            <span className="font-medium truncate max-w-32">{order.userEmail}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span>Statut</span>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                              {STATUS_LABELS[order.status]}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-brown-light mt-4 break-all">{order.id}</p>
                        <div className="mt-4">
                          <InvoiceButton order={order} variant="outline" className="w-full justify-center" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
