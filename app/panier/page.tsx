"use client";

import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";

export default function PanierPage() {
  const { items, removeItem, updateQuantity, total } = useCart();

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

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h1 className="font-serif text-3xl font-semibold text-brown">Votre panier</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-3 gap-10">
        {/* Articles */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex items-start gap-4 p-4 border border-border rounded-2xl bg-cream">
              <div className="relative w-20 h-20 bg-sand rounded-xl overflow-hidden flex-shrink-0">
                {item.imageUrl
                  ? <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={20} className="text-parchment" /></div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif font-medium text-brown truncate">{item.name}</h3>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-terracotta text-sm font-semibold">{formatPrice(item.price)}</p>
                  {item.customizationExtra && item.customizationExtra > 0 && item.basePrice && (
                    <p className="text-xs text-brown-light">
                      ({formatPrice(item.basePrice)} + {formatPrice(item.customizationExtra)} perso.)
                    </p>
                  )}
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
              </div>
              <div className="flex items-center border border-border rounded-xl bg-sand flex-shrink-0">
                <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="px-3 py-2 text-brown-light hover:text-brown transition-colors text-sm">−</button>
                <span className="px-3 text-sm font-medium text-brown">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="px-3 py-2 text-brown-light hover:text-brown transition-colors text-sm">+</button>
              </div>
              <p className="text-sm font-semibold text-brown w-20 text-right flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
              <button onClick={() => removeItem(item.cartItemId)} className="p-1.5 text-brown-light hover:text-terracotta transition-colors flex-shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
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
          <div className="border-t border-border pt-4 flex justify-between font-semibold text-brown">
            <span>Total</span>
            <span className="text-terracotta text-lg">{formatPrice(total)}</span>
          </div>
          <Link href="/checkout" className="flex items-center justify-center gap-2 w-full py-3.5 bg-brown text-cream rounded-xl font-medium hover:bg-brown-mid transition-colors text-sm">
            Commander <ArrowRight size={15} />
          </Link>
          <Link href="/catalogue" className="block text-center text-sm text-brown-light hover:text-terracotta transition-colors">
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  );
}
