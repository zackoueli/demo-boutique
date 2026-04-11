"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Charge tous les produits une fois au montage
  useEffect(() => {
    getDocs(collection(db, "products"))
      .then((snap) => setAllProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))))
      .catch(() => {});
  }, []);

  // Filtre en temps réel
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(
      allProducts
        .filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        )
        .slice(0, 6)
    );
  }, [query, allProducts]);

  // Ferme en cliquant dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleClose() {
    setOpen(false);
    setQuery("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    handleClose();
    router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
  }

  function handleSelect() {
    handleClose();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bouton loupe */}
      {!open && (
        <button
          onClick={handleOpen}
          className="p-2.5 rounded-full hover:bg-sand transition-colors"
          aria-label="Rechercher"
        >
          <Search size={19} className="text-brown-mid" />
        </button>
      )}

      {/* Champ de recherche */}
      {open && (
        <div className="flex items-center gap-2 bg-sand border border-border rounded-full px-4 py-2 w-64">
          <Search size={15} className="text-brown-light flex-shrink-0" />
          <form onSubmit={handleSubmit} className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-transparent text-sm text-brown placeholder:text-brown-light focus:outline-none"
            />
          </form>
          <button onClick={handleClose} className="text-brown-light hover:text-brown transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dropdown résultats */}
      {open && query.trim() && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-cream border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-brown-light">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/produits/${p.slug}`}
                    onClick={handleSelect}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-sand transition-colors"
                  >
                    <div className="relative w-10 h-10 bg-sand rounded-lg overflow-hidden flex-shrink-0">
                      {p.imageUrl
                        ? <Image src={p.imageUrl} alt={p.name} fill sizes="40px" className="object-cover" />
                        : <div className="w-full h-full bg-parchment" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brown truncate">{p.name}</p>
                      <p className="text-xs text-brown-light capitalize">{p.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-terracotta flex-shrink-0">
                      {formatPrice(p.price)}
                    </span>
                  </Link>
                ))}
              </div>
              {results.length >= 6 && (
                <button
                  onClick={() => { handleClose(); router.push(`/recherche?q=${encodeURIComponent(query.trim())}`); }}
                  className="w-full px-4 py-3 text-sm text-terracotta hover:bg-sand transition-colors border-t border-border font-medium"
                >
                  Voir tous les résultats →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
