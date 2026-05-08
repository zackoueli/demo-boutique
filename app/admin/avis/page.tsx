"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Star, Trash2, Pencil, Check, X, Sparkles } from "lucide-react";
import type { Product } from "@/lib/types";

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  featured: boolean;
  createdAt: { seconds: number } | null;
}

interface EditState {
  userName: string;
  rating: number;
  comment: string;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="cursor-pointer"
        >
          <Star size={18} fill={s <= (hover || value) ? "#c0826a" : "none"} stroke="#c0826a" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}

export default function AdminAvis() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ userName: "", rating: 5, comment: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [reviewsSnap, productsSnap] = await Promise.all([
        getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(200))),
      ]);
      const reviewsData = reviewsSnap.docs.map((d) => ({ id: d.id, featured: false, ...d.data() } as Review));
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

  function startEdit(review: Review) {
    setEditing(review.id);
    setEditState({ userName: review.userName, rating: review.rating, comment: review.comment });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await updateDoc(doc(db, "reviews", id), {
        userName: editState.userName.trim(),
        rating: editState.rating,
        comment: editState.comment.trim(),
      });
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, ...editState } : r));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

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

  async function toggleFeatured(review: Review) {
    const next = !review.featured;
    await updateDoc(doc(db, "reviews", review.id), { featured: next });
    setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, featured: next } : r));
  }

  const featuredCount = reviews.filter((r) => r.featured).length;
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
            {reviews.length} avis · Moyenne {avgAll}/5 · <span className="text-terracotta font-medium">{featuredCount} mis en avant</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-sand rounded-2xl animate-pulse" />)}
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
            const isEditing = editing === review.id;

            return (
              <div
                key={review.id}
                className={`bg-sand border rounded-2xl p-5 transition-all ${review.featured ? "border-terracotta/40 bg-terra-pale/30" : "border-border"}`}
              >
                {isEditing ? (
                  /* ── Mode édition ── */
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-brown-light mb-1 block">Nom</label>
                        <input
                          value={editState.userName}
                          onChange={(e) => setEditState((s) => ({ ...s, userName: e.target.value }))}
                          className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-cream text-brown focus:outline-none focus:ring-2 focus:ring-brown"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-brown-light mb-1 block">Note</label>
                        <StarPicker value={editState.rating} onChange={(v) => setEditState((s) => ({ ...s, rating: v }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-brown-light mb-1 block">Commentaire</label>
                      <textarea
                        value={editState.comment}
                        onChange={(e) => setEditState((s) => ({ ...s, comment: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-cream text-brown focus:outline-none focus:ring-2 focus:ring-brown resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(review.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-50"
                      >
                        <Check size={14} /> Enregistrer
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="flex items-center gap-1.5 px-4 py-2 border border-border text-brown-mid rounded-xl text-sm hover:bg-cream transition-colors"
                      >
                        <X size={14} /> Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Mode lecture ── */
                  <div className="flex gap-4 items-start">
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
                        {review.featured && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta">
                            <Sparkles size={9} /> En avant
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

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Mettre en avant */}
                      <button
                        onClick={() => toggleFeatured(review)}
                        title={review.featured ? "Retirer de la page d'accueil" : "Mettre en avant sur la page d'accueil"}
                        className={`p-2 rounded-xl transition-colors ${review.featured ? "text-terracotta bg-terracotta/10 hover:bg-terracotta/20" : "text-brown-light hover:text-terracotta hover:bg-terra-pale"}`}
                      >
                        <Sparkles size={15} />
                      </button>
                      {/* Modifier */}
                      <button
                        onClick={() => startEdit(review)}
                        className="p-2 rounded-xl text-brown-light hover:text-brown hover:bg-parchment transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={15} />
                      </button>
                      {/* Supprimer */}
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={deleting === review.id}
                        className="p-2 rounded-xl text-brown-light hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
