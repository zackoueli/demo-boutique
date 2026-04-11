"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface WishlistContextValue {
  items: string[]; // productIds
  toggle: (productId: string) => void;
  isWished: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue>({
  items: [], toggle: () => {}, isWished: () => false, count: 0,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wishlist");
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  function toggle(productId: string) {
    setItems((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try { localStorage.setItem("wishlist", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function isWished(productId: string) {
    return items.includes(productId);
  }

  return (
    <WishlistContext.Provider value={{ items, toggle, isWished, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
