"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useWishlist } from "@/lib/wishlist-context";
import type { Product } from "@/lib/types";
import ProductCard from "@/app/ui/product-card";
import { Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProductGridSkeleton } from "@/app/ui/skeletons";

export default function SouhaitsPage() {
  const { items } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length === 0) { setLoading(false); setProducts([]); return; }
    setLoading(true);
    // Firestore limite les "in" à 30 éléments
    const chunks = [];
    for (let i = 0; i < items.length; i += 30) chunks.push(items.slice(i, i + 30));
    Promise.all(
      chunks.map((chunk) =>
        getDocs(query(collection(db, "products"), where(documentId(), "in", chunk)))
      )
    ).then((snaps) => {
      const all = snaps.flatMap((snap) =>
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))
      );
      setProducts(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [items]);

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">Ma liste</p>
          <h1 className="font-serif text-4xl font-semibold text-brown flex items-center gap-3">
            Mes favoris
            {items.length > 0 && (
              <span className="text-base font-sans font-normal text-brown-light">({items.length})</span>
            )}
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : items.length === 0 ? (
          <div className="text-center py-28">
            <Heart size={48} className="mx-auto mb-4 text-parchment" />
            <p className="font-serif text-xl text-brown mb-2">Votre liste de souhaits est vide</p>
            <p className="text-brown-light text-sm mb-8">
              Ajoutez des bijoux en cliquant sur le cœur sur chaque produit.
            </p>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-7 py-3 bg-brown text-cream rounded-full font-medium hover:bg-brown-mid transition-colors text-sm"
            >
              Découvrir la collection <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
