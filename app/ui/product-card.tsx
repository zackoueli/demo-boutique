"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";
import WishlistButton from "./wishlist-button";

const CATEGORY_LABELS: Record<Product["category"], string> = {
  rings: "Bague",
  necklaces: "Collier",
  bracelets: "Bracelet",
  earrings: "Boucles d'oreilles",
};

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addItem({
      cartItemId: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      basePrice: product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    showToast({
      message: product.name,
      imageUrl: product.imageUrl,
      price: formatPrice(product.price),
    });
  }

  return (
    <Link
      href={`/produits/${product.slug}`}
      className="group flex flex-col bg-cream border border-border rounded-2xl overflow-hidden hover:shadow-md hover:shadow-parchment transition-all duration-300"
    >
      <div className="relative aspect-square bg-sand overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={36} className="text-parchment" />
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-cream/70 flex items-center justify-center">
            <span className="text-xs font-medium text-brown-light bg-cream px-3 py-1 rounded-full border border-border">
              Rupture de stock
            </span>
          </div>
        )}
        {product.featured && (
          <span className="absolute top-3 left-3 bg-terracotta text-cream text-xs font-medium px-2.5 py-1 rounded-full">
            Coup de cœur
          </span>
        )}
        <div className="absolute top-3 right-3">
          <WishlistButton productId={product.id} size={13} />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-brown-light uppercase tracking-wider mb-1">
          {CATEGORY_LABELS[product.category]}
        </p>
        <h3 className="font-serif font-medium text-brown leading-snug flex-1">{product.name}</h3>
        <div className="flex items-center justify-between mt-3">
          <span className="text-terracotta font-semibold">{formatPrice(product.price)}</span>
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="p-2 rounded-xl bg-brown text-cream hover:bg-brown-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
}
