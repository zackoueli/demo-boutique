"use client";

import { useEffect } from "react";
import { useCart, buildCartItemId } from "@/lib/cart-context";
import type { CartItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_PRICE, PREPARATION_DELAY, amountToFreeShipping,
} from "@/lib/shipping";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2, ArrowRight, Truck, Lock, Clock } from "lucide-react";

export default function PanierPage() {
  const { items, removeItem, updateQuantity, replaceItems, total, ready } = useCart();

  // Lien « Retrouver mon panier » des emails de relance : on recharge le panier sauvegardé
  useEffect(() => {
    if (!ready || items.length > 0) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("restore");
    const token = params.get("t");
    if (!id || !token) return;
    fetch(`/api/cart/restore?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: Omit<CartItem, "cartItemId">[] } | null) => {
        if (!data?.items?.length) return;
        replaceItems(data.items.map((item) => ({ ...item, cartItemId: buildCartItemId(item.productId, item.customization) })));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return <div className="bg-cream min-h-screen" />;

  if (items.length === 0) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <ShoppingBag size={48} className="text-parchment mx-auto mb-5" />
          <h1 className="font-serif text-2xl font-semibold text-brown mb-3">Votre panier est vide</h1>
          <p className="text-brown-light mb-8">Découvrez nos créations artisanales.</p>
          <Link href="/catalogue" className="inline-flex items-center gap-2 px-7 py-3 bg-brown text-cream rounded-full font-medium hover:bg-brown-mid transition-colors text-sm">
            Voir le catalogue <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  const remaining = amountToFreeShipping(total);
  const freeShipping = remaining === 0;
  const progress = Math.min(100, Math.round((total / FREE_SHIPPING_THRESHOLD) * 100));
  const shippingEstimate = freeShipping ? 0 : DEFAULT_SHIPPING_PRICE;

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="font-serif text-3xl font-semibold text-brown">Votre panier</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          {/* Jauge livraison offerte */}
          <div className="p-4 border border-border rounded-2xl bg-sand" role="status">
            <p className="flex items-center gap-2 text-sm text-brown-mid">
              <Truck size={16} className="text-terracotta flex-shrink-0" />
              {freeShipping ? (
                <span><strong className="text-brown">Livraison offerte</strong> sur votre commande.</span>
              ) : (
                <span>
                  Plus que <strong className="text-brown">{formatPrice(remaining)}</strong> pour bénéficier de la livraison offerte.
                </span>
              )}
            </p>
            <div className="mt-3 h-1.5 bg-parchment rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${freeShipping ? "bg-green-600" : "bg-terracotta"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Articles */}
          {items.map((item) => {
            const atMax = item.maxQuantity !== undefined && item.quantity >= item.maxQuantity;
            return (
              <div key={item.cartItemId} className="flex items-start gap-4 p-4 border border-border rounded-2xl bg-cream">
                <div className="relative w-20 h-20 bg-sand rounded-xl overflow-hidden flex-shrink-0">
                  {item.imageUrl
                    ? <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={20} className="text-parchment" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-medium text-brown line-clamp-2">{item.name}</h3>
                      <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                        <p className="text-terracotta text-sm font-semibold">{formatPrice(item.price)}</p>
                        {item.customizationExtra && item.customizationExtra > 0 && item.basePrice && (
                          <p className="text-xs text-brown-light">
                            ({formatPrice(item.basePrice)} + {formatPrice(item.customizationExtra)} perso.)
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      aria-label={`Retirer ${item.name} du panier`}
                      className="p-2 -m-1 text-brown-light hover:text-terracotta transition-colors flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {item.customizationLabels && Object.keys(item.customizationLabels).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Object.entries(item.customizationLabels).map(([label, value]) => (
                        <span key={label} className="text-xs bg-sand border border-border rounded-lg px-2 py-0.5 text-brown-mid">
                          {label} : {value}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex items-center border border-border rounded-xl bg-sand">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        aria-label="Diminuer la quantité"
                        className="px-3.5 py-2 text-brown-light hover:text-brown transition-colors text-sm"
                      >−</button>
                      <span className="px-2 text-sm font-medium text-brown min-w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        disabled={atMax}
                        aria-label="Augmenter la quantité"
                        className="px-3.5 py-2 text-brown-light hover:text-brown transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                      >+</button>
                    </div>
                    <p className="text-sm font-semibold text-brown">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  {atMax && <p className="text-xs text-brown-light mt-1.5">Quantité maximale disponible</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Récapitulatif */}
        <div className="bg-sand border border-border rounded-2xl p-6 h-fit space-y-5">
          <h2 className="font-serif font-semibold text-brown text-lg">Récapitulatif</h2>
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between text-brown-light">
                <span className="truncate flex-1 pr-2">{item.name} × {item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-brown-light">
              <span>Sous-total</span><span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between text-brown-light">
              <span>Livraison en point relais</span>
              {freeShipping
                ? <span className="text-green-700 font-medium">Offerte</span>
                : <span>{formatPrice(shippingEstimate)}</span>}
            </div>
            <p className="text-xs text-brown-light">Remise en main propre gratuite, à choisir à l&apos;étape suivante.</p>
          </div>
          <div className="border-t border-border pt-4 flex justify-between font-semibold text-brown">
            <span>Total estimé</span>
            <span className="text-terracotta text-lg">{formatPrice(total + shippingEstimate)}</span>
          </div>
          <Link href="/checkout" className="flex items-center justify-center gap-2 w-full py-3.5 bg-brown text-cream rounded-xl font-medium hover:bg-brown-mid transition-colors text-sm">
            Commander <ArrowRight size={15} />
          </Link>
          <ul className="space-y-1.5 text-xs text-brown-light">
            <li className="flex items-center gap-2"><Lock size={12} className="flex-shrink-0" /> Paiement sécurisé par Stripe, sans création de compte</li>
            <li className="flex items-center gap-2">
              <Clock size={12} className="flex-shrink-0" />
              {items.some((i) => i.customization && Object.keys(i.customization).length > 0)
                ? "Créations personnalisées réalisées sur commande"
                : `Expédition sous ${PREPARATION_DELAY}`}
            </li>
          </ul>
          <Link href="/catalogue" className="block text-center text-sm text-brown-light hover:text-terracotta transition-colors">
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
}
