"use client";

import { useEffect, useState } from "react";
import {
  collection, query, where, getDocs, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Star } from "lucide-react";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: { seconds: number } | null;
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={onChange ? "button" : undefined}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={18}
            className={
              star <= (hover || value)
                ? "text-terracotta fill-terracotta"
                : "text-border fill-transparent"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: { productId: string }) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOrdered, setHasOrdered] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadReviews() {
    const snap = await getDocs(
      query(collection(db, "reviews"), where("productId", "==", productId))
    );
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
    data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    setReviews(data);
    if (user) setHasReviewed(data.some((r) => r.userId === user.uid));
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
  }, [productId]);

  useEffect(() => {
    if (!user) return;
    // Vérifie si l'utilisateur a commandé ce produit
    getDocs(query(collection(db, "orders"), where("userId", "==", user.uid))).then((snap) => {
      const ordered = snap.docs.some((d) => {
        const items = d.data().items ?? [];
        return items.some((item: { productId: string }) => item.productId === productId);
      });
      setHasOrdered(ordered);
    });
  }, [user, productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "reviews"), {
        productId,
        userId: user.uid,
        userName: profile?.displayName || user.email || "Anonyme",
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });
      setComment("");
      setRating(5);
      setShowForm(false);
      await loadReviews();
    } finally {
      setSaving(false);
    }
  }

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="mt-16 border-t border-border pt-12">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">
            Témoignages
          </p>
          <h2 className="font-serif text-2xl font-semibold text-brown">Avis clients</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <StarRating value={Math.round(average)} />
              <span className="text-sm text-brown-light">
                {average.toFixed(1)} · {reviews.length} avis
              </span>
            </div>
          )}
        </div>
        {user && hasOrdered && !hasReviewed && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-brown text-cream text-sm font-medium rounded-xl hover:bg-brown-mid transition-colors"
          >
            Laisser un avis
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-sand border border-border rounded-2xl p-6 mb-8 space-y-4">
          <h3 className="font-serif font-semibold text-brown">Votre avis</h3>
          <div>
            <label className="block text-sm font-medium text-brown-mid mb-2">Note</label>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-brown-mid mb-1.5">Commentaire</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={3}
              placeholder="Partagez votre expérience avec ce produit…"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 border border-border text-brown-mid rounded-xl text-sm hover:bg-cream transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-50">
              {saving ? "Envoi…" : "Publier"}
            </button>
          </div>
        </form>
      )}

      {/* Message si non connecté ou n'a pas commandé */}
      {!user && (
        <p className="text-sm text-brown-light mb-6">
          <a href="/connexion" className="text-terracotta hover:underline">Connectez-vous</a> pour laisser un avis après votre achat.
        </p>
      )}
      {user && !hasOrdered && (
        <p className="text-sm text-brown-light mb-6">Vous pourrez laisser un avis après avoir commandé ce produit.</p>
      )}

      {/* Liste des avis */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-sand rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-brown-light">
          <Star size={32} className="mx-auto mb-3 text-parchment" />
          <p className="font-serif">Aucun avis pour l&apos;instant.</p>
          <p className="text-sm mt-1">Soyez le premier à partager votre expérience !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-sand border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-brown text-sm">{r.userName}</p>
                  <StarRating value={r.rating} />
                </div>
                {r.createdAt && (
                  <p className="text-xs text-brown-light">
                    {new Date(r.createdAt.seconds * 1000).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <p className="text-sm text-brown-mid leading-relaxed mt-3">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
