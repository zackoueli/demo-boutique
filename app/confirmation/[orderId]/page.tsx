"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { track } from "@/lib/analytics";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import InvoiceButton from "@/app/ui/invoice-button";

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "En attente", processing: "En préparation", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};

type Props = { params: Promise<{ orderId: string }> };

export default function ConfirmationPage(props: Props) {
  return (
    <Suspense fallback={<ConfirmationSkeleton />}>
      <Confirmation {...props} />
    </Suspense>
  );
}

function ConfirmationSkeleton() {
  return (
    <div className="bg-cream min-h-screen flex items-center justify-center">
      <div className="text-center animate-pulse space-y-4">
        <div className="w-16 h-16 bg-sand rounded-full mx-auto" />
        <div className="h-5 bg-sand rounded w-48 mx-auto" />
      </div>
    </div>
  );
}

function Confirmation(props: Props) {
  const { orderId } = use(props.params);
  const searchParams = useSearchParams();
  // "pi" vient du checkout ; "payment_intent" est ajouté par Stripe après une redirection (PayPal…)
  const paymentIntentId = searchParams.get("pi") ?? searchParams.get("payment_intent");
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notFound" | "unpaid">("loading");
  const { user, loading: authLoading } = useAuth();
  const { clearCart, ready: cartReady } = useCart();

  // Arrivée depuis le paiement : le serveur enregistre la commande et renvoie son récapitulatif
  useEffect(() => {
    if (!paymentIntentId || !cartReady) return;
    let active = true;
    fetch("/api/orders/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (res.ok && data.order?.id === orderId) {
          setOrder(data.order as Order);
          setState("ready");
          track("purchase", { orderId, value: data.order.total });
          clearCart();
        } else {
          setState(res.status === 409 ? "unpaid" : "notFound");
        }
      })
      .catch(() => { if (active) setState("notFound"); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentIntentId, orderId, cartReady]);

  // Retour ultérieur depuis son compte : lecture directe de ses propres commandes
  useEffect(() => {
    if (paymentIntentId || authLoading || !user) return;
    getDocs(query(collection(db, "orders"), where("userId", "==", user.uid), where("id", "==", orderId)))
      .then((snap) => {
        if (snap.empty) { setState("notFound"); return; }
        setOrder(snap.docs[0].data() as Order);
        setState("ready");
      })
      .catch((err) => {
        console.error("[confirmation] erreur lecture commande:", err);
        setState("notFound");
      });
  }, [paymentIntentId, orderId, user, authLoading]);

  // Sans référence de paiement ni compte connecté, rien ne permet d'afficher la commande
  const noAccess = !paymentIntentId && !authLoading && !user;

  if (state === "loading" && !noAccess) return <ConfirmationSkeleton />;

  if (state === "unpaid") {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <p className="font-serif text-xl text-brown">Paiement non finalisé</p>
          <p className="text-brown-light text-sm">
            Votre paiement n&apos;a pas abouti ou est encore en cours de validation. Votre panier est conservé.
          </p>
          <Link href="/checkout" className="inline-block px-6 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors">
            Reprendre ma commande
          </Link>
        </div>
      </div>
    );
  }

  if (noAccess || state === "notFound" || !order) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="font-serif text-xl text-brown">Commande introuvable</p>
          <p className="text-brown-light text-sm">Cette commande n&apos;existe pas ou ne vous appartient pas.</p>
          <Link href="/catalogue" className="inline-block px-6 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors">
            Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  const isPickup = order.shipping.carrier === "En main propre";

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-terra-pale rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-terracotta" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-brown mb-3">Commande confirmée !</h1>
          <p className="text-brown-light">
            Merci pour votre achat. Un email de confirmation est envoyé à <span className="text-brown-mid font-medium">{order.userEmail}</span>.
          </p>
          <p className="text-xs text-brown-light mt-2 font-mono">Réf. {orderId}</p>
        </div>

        <div className="bg-sand border border-border rounded-2xl p-7 space-y-7">
          <div>
            <h2 className="font-serif font-semibold text-brown mb-4">Articles commandés</h2>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="text-sm text-brown-mid">
                  <div className="flex justify-between">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                  {item.customizationLabels && Object.keys(item.customizationLabels).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(item.customizationLabels).map(([label, value]) => (
                        <span key={label} className="text-xs bg-sand border border-border rounded px-1.5 py-0.5 text-brown-mid">
                          {label} : {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-4 space-y-1.5 text-sm text-brown-light">
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Réduction{order.promoCode ? ` (${order.promoCode})` : ""}</span>
                  <span>−{formatPrice(order.discount!)}</span>
                </div>
              )}
              {order.shippingCost !== undefined && (
                <div className="flex justify-between">
                  <span>Livraison</span>
                  <span>{order.shippingCost === 0 ? "Offerte" : formatPrice(order.shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-brown text-base pt-1">
                <span>Total payé</span>
                <span className="text-terracotta">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-serif font-semibold text-brown mb-3">
              {isPickup ? "Remise en main propre" : order.shipping.type === "relay" ? "Livraison en point relais" : "Livraison à"}
            </h2>
            {isPickup ? (
              <p className="text-sm text-brown-light leading-relaxed">
                Nous vous contactons par email pour convenir d&apos;un rendez-vous.
              </p>
            ) : (
              <address className="text-sm text-brown-light not-italic leading-relaxed">
                <p>{order.shipping.relayPoint?.name ?? order.shipping.fullName}</p>
                <p>{order.shipping.address}</p>
                <p>{order.shipping.postalCode} {order.shipping.city}</p>
                <p>{order.shipping.country}</p>
              </address>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-brown-light">Statut :</span>
            <span className="font-medium text-brown">{STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          {user && (
            <Link href="/compte" className="flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-medium text-brown-mid hover:bg-sand transition-colors">
              Voir mes commandes
            </Link>
          )}
          <InvoiceButton order={order} variant="outline" />
          <Link href="/catalogue" className="flex items-center justify-center gap-2 px-6 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors">
            Continuer mes achats <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
