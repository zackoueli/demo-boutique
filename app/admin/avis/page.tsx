"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, doc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Star, Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: { seconds: number } | null;
}

export default function AdminAvis() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    try {
      const [reviewsSnap, productsSnap] = await Promise.all([
        getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(200))),
      ]);
      const reviewsData = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
      const productsMap: Record<string, Product> = {};
      productsSnap.docs.forEach((d) => { productsMap[d.id] = { id: d.id, ...d.data() } as Product; });
      setReviews(reviewsData);
      setProducts(productsMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet avis ?")) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "reviews", id));
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const avgAll = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Administration</p>
        <h1 className="font-serif text-2xl font-semibold text-brown">Avis clients</h1>
        {!loading && (
          <p className="text-sm text-brown-light mt-1">
            {reviews.length} avis · Moyenne {avgAll}/5
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-sand rounded-2xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 text-brown-light">
          <Star size={32} className="mx-auto mb-3 text-parchment" />
          <p className="font-serif">Aucun avis pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const product = products[review.productId];
            return (
              <div key={review.id} className="bg-sand border border-border rounded-2xl p-5 flex gap-4 items-start">
                {/* Note + contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={13} fill={s <= review.rating ? "#c0826a" : "none"} stroke="#c0826a" strokeWidth={1.5} />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-brown">{review.userName}</span>
                    {review.createdAt && (
                      <span className="text-xs text-brown-light">
                        {new Date(review.createdAt.seconds * 1000).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brown-mid leading-relaxed mb-2">{review.comment}</p>
                  {product && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-parchment text-brown-light border border-border">
                      {product.name}
                    </span>
                  )}
                </div>
                {/* Supprimer */}
                <button
                  onClick={() => handleDelete(review.id)}
                  disabled={deleting === review.id}
                  className="flex-shrink-0 p-2 rounded-xl text-brown-light hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
