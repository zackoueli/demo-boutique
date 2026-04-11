"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-context";

export default function WishlistButton({
  productId,
  size = 16,
  className = "",
}: {
  productId: string;
  size?: number;
  className?: string;
}) {
  const { toggle, isWished } = useWishlist();
  const wished = isWished(productId);

  return (
    <button
      onClick={(e) => { e.preventDefault(); toggle(productId); }}
      aria-label={wished ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`p-2 rounded-xl transition-colors ${
        wished
          ? "bg-terra-pale text-terracotta"
          : "bg-cream/80 text-brown-light hover:text-terracotta hover:bg-terra-pale"
      } ${className}`}
    >
      <Heart size={size} className={wished ? "fill-terracotta" : ""} />
    </button>
  );
}
