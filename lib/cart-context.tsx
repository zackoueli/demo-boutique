"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { CartItem } from "./types";
import { track } from "./analytics";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  replaceItems: (items: CartItem[]) => void;
  clearCart: () => void;
  total: number;
  count: number;
  /** false tant que le panier n'a pas été relu depuis le navigateur */
  ready: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Quantité plafonnée au stock connu, toutes personnalisations d'un même produit confondues */
function clampQuantity(items: CartItem[], target: CartItem, wanted: number): number {
  if (target.maxQuantity === undefined) return wanted;
  const others = items
    .filter((i) => i.productId === target.productId && i.cartItemId !== target.cartItemId)
    .reduce((sum, i) => sum + i.quantity, 0);
  return Math.min(wanted, Math.max(0, target.maxQuantity - others));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) setItems(JSON.parse(stored));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("cart", JSON.stringify(items));
  }, [items, ready]);

  function addItem(item: CartItem) {
    track("add_to_cart", {
      value: item.price * item.quantity,
      items: [{ id: item.productId, name: item.name, price: item.price, quantity: item.quantity }],
    });
    setItems((prev) => {
      const existing = prev.find((i) => i.cartItemId === item.cartItemId);
      if (existing) {
        const merged = { ...existing, maxQuantity: item.maxQuantity ?? existing.maxQuantity };
        const quantity = clampQuantity(prev, merged, existing.quantity + item.quantity);
        return prev.map((i) => (i.cartItemId === item.cartItemId ? { ...merged, quantity } : i));
      }
      const quantity = clampQuantity(prev, item, item.quantity);
      return quantity > 0 ? [...prev, { ...item, quantity }] : prev;
    });
  }

  function removeItem(cartItemId: string) {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  }

  function updateQuantity(cartItemId: string, quantity: number) {
    if (quantity <= 0) return removeItem(cartItemId);
    setItems((prev) =>
      prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, clampQuantity(prev, i, quantity)) } : i))
    );
  }

  function replaceItems(next: CartItem[]) {
    setItems(next);
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, replaceItems, clearCart, total, count, ready }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

/** Quantité déjà au panier pour un produit, toutes personnalisations confondues */
export function quantityInCart(items: CartItem[], productId: string): number {
  return items.filter((i) => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
}

/** Génère un cartItemId unique à partir du productId et des options de personnalisation */
export function buildCartItemId(productId: string, customization?: Record<string, string>): string {
  if (!customization || Object.keys(customization).length === 0) return productId;
  const sorted = Object.keys(customization).sort().map((k) => `${k}:${customization[k]}`).join("|");
  return `${productId}_${btoa(unescape(encodeURIComponent(sorted))).slice(0, 12)}`;
}
