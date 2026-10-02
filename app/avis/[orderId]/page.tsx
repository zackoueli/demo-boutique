"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, CheckCircle } from "lucide-react";

interface ReviewItem {
  productId: string;
  name: string;
  imageUrl: string;
  reviewed: boolean;
}

type Props = { params: Promise<{ orderId: string }> };

export default function AvisPage(props: Props) {
  return (
    <div className="bg-cream min-h-screen">
      <Suspense fallback={null}>
        <AvisContent {...props} />
      </Suspense>
    </div>
  );
}

function AvisContent(props: Props) {
  const { orderId } = use(props.params);
  const token = useSearchParams().get("t") ?? "";
  const [data, setData] = useState<{ firstName: string; items: ReviewItem[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/reviews?order=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!active) return;
        if (res.ok) setData(body);
        else setError(body.error ?? "Lien invalide ou expiré.");
      })
      .catch(() => { if (active) setError("Impossible de charger votre commande. Réessayez dans un instant."); });
    return () => { active = false; };
  }, [orderId, token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="space-y-4">
          <p className="font-serif text-xl text-brown">{error}</p>
          <Link href="/contact" className="inline-block text-sm text-terracotta hover:underline">Nous écrire</Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-4">
        {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-sand rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <>
      <div className="bg-sand border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">Commande {orderId}</p>
          <h1 className="font-serif text-3xl font-semibold text-brown">
            {data.firstName ? `${data.firstName}, votre avis compte` : "Votre avis compte"}
          </h1>
          <p className="text-brown-light mt-3 leading-relaxed">
            Quelques mots suffisent. Votre avis est publié sur la fiche du produit, avec votre prénom.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        {data.items.map((item) => (
          <ReviewForm key={item.productId} item={item} orderId={orderId} token={token} />
        ))}
      </div>
    </>
  );
}

function ReviewForm({ item, orderId, token }: { item: ReviewItem; orderId: string; token: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">(item.reviewed ? "done" : "idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Choisissez une note en cliquant sur les étoiles."); return; }
    setState("saving"); setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderId, t: token, productId: item.productId, rating, comment }),
      });
      if (res.ok) { setState("done"); return; }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "L'envoi a échoué. Réessayez dans un instant.");
    } catch {
      setError("L'envoi a échoué. Réessayez dans un instant.");
    }
    setState("idle");
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-2xl p-5 bg-cream space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 bg-sand rounded-xl overflow-hidden flex-shrink-0">
          {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <h2 className="font-serif font-medium text-brown">{item.name}</h2>
      </div>

      {state === "done" ? (
        <p className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle size={16} /> Merci, votre avis est publié.
        </p>
      ) : (
        <>
          <div className="flex gap-1" role="radiogroup" aria-label="Note sur 5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="p-1"
              >
                <Star size={28} className={star <= (hover || rating) ? "text-terracotta fill-terracotta" : "text-border fill-transparent"} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows={3}
            maxLength={1500}
            placeholder="Ce que vous avez pensé de cette création…"
            className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition resize-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={state === "saving"}
            className="px-6 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-50"
          >
            {state === "saving" ? "Envoi…" : "Publier mon avis"}
          </button>
        </>
      )}
    </form>
  );
}
