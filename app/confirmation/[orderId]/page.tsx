"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight } from "lucide-react";
import InvoiceButton from "@/app/ui/invoice-button";

export default function ConfirmationPage(props: { params: Promise<{ orderId: string }> }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => { props.params.then(({ orderId }) => setOrderId(orderId)); }, [props.params]);

  useEffect(() => {
    if (!orderId || authLoading) return;

    // Redirige les non-connectés vers la page de connexion
    if (!user) {
      router.replace(`/connexion?from=/confirmation/${orderId}`);
      return;
    }

    getDocs(query(collection(db, "orders"), where("id", "==", orderId), limit(1))).then((snap) => {
      if (snap.empty) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = snap.docs[0].data() as Order;
      // Vérifie que la commande appartient à l'utilisateur connecté (sauf admin)
      if (!isAdmin && data.userId !== user.uid) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrder(data);
      setLoading(false);
    });
  }, [orderId, user, isAdmin, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse space-y-4">
          <div className="w-16 h-16 bg-sand rounded-full mx-auto" />
          <div className="h-5 bg-sand rounded w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
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

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-terra-pale rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-terracotta" />
          </div>
          <h1 className="font-serif text-3xl font-semibold text-brown mb-3">Commande confirmée !</h1>
          <p className="text-brown-light">Merci pour votre achat. Vous recevrez une confirmation par email.</p>
          {orderId && <p className="text-xs text-brown-light mt-2 font-mono">Réf. {orderId}</p>}
        </div>

        {order && (
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
              <div className="border-t border-border mt-4 pt-4 flex justify-between font-semibold text-brown">
                <span>Total payé</span>
                <span className="text-terracotta">{formatPrice(order.total)}</span>
              </div>
            </div>

            <div>
              <h2 className="font-serif font-semibold text-brown mb-3">Livraison à</h2>
              <address className="text-sm text-brown-light not-italic leading-relaxed">
                <p>{order.shipping.fullName}</p>
                <p>{order.shipping.address}</p>
                <p>{order.shipping.postalCode} {order.shipping.city}</p>
                <p>{order.shipping.country}</p>
              </address>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              <span className="text-brown-light">Statut :</span>
              <span className="font-medium text-brown capitalize">{order.status}</span>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          <Link href="/compte" className="flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl text-sm font-medium text-brown-mid hover:bg-sand transition-colors">
            Voir mes commandes
          </Link>
          {order && <InvoiceButton order={order} variant="outline" />}
          <Link href="/catalogue" className="flex items-center justify-center gap-2 px-6 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors">
            Continuer mes achats <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
