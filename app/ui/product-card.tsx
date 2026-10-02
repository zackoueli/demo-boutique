"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Star, Wand2 } from "lucide-react";
import { useCart, quantityInCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { useCategories } from "@/lib/categories";
import { useRating } from "@/lib/ratings";
import { hasRequiredCustomization } from "@/lib/customization";
import WishlistButton from "./wishlist-button";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const { showToast } = useToast();
  const { categories } = useCategories();
  const rating = useRating(product.id);

  // Une personnalisation obligatoire se renseigne sur la fiche : le bouton y mène au lieu d'ajouter
  const needsCustomization = hasRequiredCustomization(product.customizationFields);
  const categoryLabel = categories.find((c) => c.key === product.category)?.label;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (quantityInCart(items, product.id) >= product.stock) {
      showToast({ message: "Quantité maximale déjà au panier" });
      return;
    }
    addItem({
      cartItemId: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      basePrice: product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
      maxQuantity: product.stock,
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
        {categoryLabel && (
          <p className="text-xs text-brown-light uppercase tracking-wider mb-1">{categoryLabel}</p>
        )}
        <h3 className="font-serif font-medium text-brown leading-snug flex-1">{product.name}</h3>
        {rating && (
          <p className="flex items-center gap-1 mt-1.5 text-xs text-brown-light" aria-label={`Note ${rating.average.toFixed(1)} sur 5, ${rating.count} avis`}>
            <Star size={12} className="text-terracotta fill-terracotta" />
            <span className="font-medium text-brown-mid">{rating.average.toFixed(1).replace(".", ",")}</span>
            <span>({rating.count})</span>
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-terracotta font-semibold">{formatPrice(product.price)}</span>
          {needsCustomization ? (
            <span
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brown text-cream text-xs font-medium group-hover:bg-brown-mid transition-colors"
              title="Ce bijou se personnalise sur sa fiche"
            >
              <Wand2 size={13} /> Personnaliser
            </span>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              aria-label={`Ajouter ${product.name} au panier`}
              className="p-2 rounded-xl bg-brown text-cream hover:bg-brown-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={14} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
