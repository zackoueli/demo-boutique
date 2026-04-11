"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, generateOrderId } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Lock, MapPin } from "lucide-react";

/* ─── Types API Adresse ─── */
interface BanFeature {
  properties: {
    label: string;
    housenumber?: string;
    street?: string;
    name: string;
    postcode: string;
    city: string;
    context: string;
  };
}

/* ─── Composant autocomplete adresse ─── */
function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (address: string, city: string, postalCode: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 4) { setSuggestions([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&type=housenumber&limit=5&autocomplete=1`
        );
        const data = await res.json();
        setSuggestions(data.features ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(feature: BanFeature) {
    const { name, postcode, city } = feature.properties;
    onSelect(name, city, postcode);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-brown-mid mb-1.5">
        Adresse <span className="text-terracotta">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex : 12 rue de la Paix"
          required
          className="w-full px-4 py-3 pr-10 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading
            ? <div className="w-4 h-4 border-2 border-brown-light border-t-transparent rounded-full animate-spin" />
            : <MapPin size={15} className="text-brown-light" />
          }
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-cream border border-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((f, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleSelect(f)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-sand transition-colors flex items-start gap-2"
              >
                <MapPin size={13} className="text-terracotta mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-brown font-medium">{f.properties.name}</span>
                  <span className="text-brown-light ml-1">{f.properties.postcode} {f.properties.city}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Page checkout ─── */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: profile?.displayName ?? "",
    email: user?.email ?? "",
    address: "", city: "", postalCode: "", country: "France",
    cardNumber: "", cardExpiry: "", cardCvc: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleAddressSelect(address: string, city: string, postalCode: string) {
    setForm((f) => ({ ...f, address, city, postalCode }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true); setError("");
    try {
      const orderId = generateOrderId();
      await addDoc(collection(db, "orders"), {
        id: orderId, userId: user?.uid ?? null, userEmail: form.email,
        status: "pending", items,
        shipping: { fullName: form.fullName, address: form.address, city: form.city, postalCode: form.postalCode, country: form.country },
        payment: { last4: form.cardNumber.replace(/\s/g, "").slice(-4), method: "card" },
        subtotal: total, total, createdAt: serverTimestamp(),
      });
      await Promise.all(
        items.map(async (item) => {
          const productRef = doc(db, "products", item.productId);
          const snap = await getDoc(productRef);
          if (snap.exists()) {
            const currentStock = snap.data().stock ?? 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            await updateDoc(productRef, { stock: newStock });
          }
        })
      );
      clearCart();
      router.push(`/confirmation/${orderId}`);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-brown-light mb-4">Votre panier est vide.</p>
          <Link href="/catalogue" className="text-terracotta hover:text-terra-light font-medium text-sm">Retour au catalogue</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Link href="/panier" className="inline-flex items-center gap-2 text-sm text-brown-light hover:text-terracotta mb-4 transition-colors">
            <ArrowLeft size={14} /> Retour au panier
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-brown">Finaliser la commande</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-3 gap-10">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="font-serif font-semibold text-brown text-lg mb-5">Livraison</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nom complet" name="fullName" value={form.fullName} onChange={handleChange} required />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
              <div className="sm:col-span-2">
                <AddressAutocomplete
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  onSelect={handleAddressSelect}
                />
              </div>
              <Field label="Ville" name="city" value={form.city} onChange={handleChange} required />
              <Field label="Code postal" name="postalCode" value={form.postalCode} onChange={handleChange} required />
              <div className="sm:col-span-2"><Field label="Pays" name="country" value={form.country} onChange={handleChange} required /></div>
            </div>
          </section>

          <section>
            <h2 className="font-serif font-semibold text-brown text-lg mb-1 flex items-center gap-2">
              <Lock size={15} className="text-brown-light" /> Paiement
            </h2>
            <p className="text-xs text-brown-light mb-5">Données factices — démo seulement</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <Field label="Numéro de carte" name="cardNumber" value={form.cardNumber} onChange={handleChange} placeholder="4242 4242 4242 4242" required />
              </div>
              <div className="sm:col-span-2">
                <Field label="Date d'expiration" name="cardExpiry" value={form.cardExpiry} onChange={handleChange} placeholder="MM/AA" required />
              </div>
              <Field label="CVC" name="cardCvc" value={form.cardCvc} onChange={handleChange} placeholder="123" required />
            </div>
          </section>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-brown text-cream font-medium rounded-2xl hover:bg-brown-mid transition-colors disabled:opacity-50 text-sm">
            {loading ? "Traitement en cours…" : `Payer ${formatPrice(total)}`}
          </button>
        </form>

        <div className="bg-sand border border-border rounded-2xl p-6 h-fit space-y-5">
          <h2 className="font-serif font-semibold text-brown">Votre commande</h2>
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-brown-light">
                <span className="truncate flex-1 pr-2">{item.name} × {item.quantity}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 flex justify-between font-semibold text-brown">
            <span>Total</span>
            <span className="text-terracotta text-lg">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, required }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-brown-mid mb-1.5">
        {label}{required && <span className="text-terracotta ml-0.5">*</span>}
      </label>
      <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition"
      />
    </div>
  );
}
