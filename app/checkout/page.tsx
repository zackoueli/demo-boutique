"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, generateOrderId } from "@/lib/utils";
import type { RelayPoint } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Lock, MapPin, Tag, X, Check, Package, Home, Store } from "lucide-react";

/* ─── Points relais démo ─── */
const RELAY_POINTS: RelayPoint[] = [
  { id: "R001", name: "Tabac Presse Central", address: "12 rue de la Paix", city: "Paris", postalCode: "75001", distance: "0.3 km" },
  { id: "R002", name: "Épicerie du Marché", address: "45 avenue Victor Hugo", city: "Paris", postalCode: "75016", distance: "0.8 km" },
  { id: "R003", name: "Librairie Papeterie Moderne", address: "8 boulevard Haussmann", city: "Paris", postalCode: "75009", distance: "1.2 km" },
  { id: "R004", name: "Pressing Express", address: "23 rue du Faubourg Saint-Antoine", city: "Paris", postalCode: "75011", distance: "1.5 km" },
  { id: "R005", name: "Supérette Point Vert", address: "67 avenue de la République", city: "Paris", postalCode: "75011", distance: "1.9 km" },
  { id: "R006", name: "Pharmacie des Lilas", address: "14 rue des Lilas", city: "Vincennes", postalCode: "94300", distance: "2.4 km" },
];

const HOME_SHIPPING_COST = 0; // livraison à domicile offerte (démo)
const RELAY_SHIPPING_COST = 0; // point relais offert (démo)

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

interface PromoResult {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
}

/* ─── Page checkout ─── */
export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [deliveryType, setDeliveryType] = useState<"home" | "relay">("home");
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);
  const [form, setForm] = useState({
    fullName: profile?.displayName ?? "",
    email: user?.email ?? "",
    address: "", city: "", postalCode: "", country: "France",
    cardNumber: "", cardExpiry: "", cardCvc: "",
  });

  const discount = promoResult
    ? promoResult.type === "percent"
      ? Math.round(total * promoResult.value / 100)
      : Math.min(total, promoResult.value)
    : 0;
  const shippingCost = deliveryType === "relay" ? RELAY_SHIPPING_COST : HOME_SHIPPING_COST;
  const finalTotal = Math.max(0, total - discount + shippingCost);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError(""); setPromoResult(null);
    try {
      const snap = await getDocs(
        query(collection(db, "promoCodes"),
          where("code", "==", promoCode.toUpperCase().trim()),
          where("active", "==", true))
      );
      if (snap.empty) { setPromoError("Code invalide ou expiré."); return; }
      const data = snap.docs[0].data() as Omit<PromoResult, "id">;
      if (data.minOrder > 0 && total < data.minOrder) {
        setPromoError(`Commande minimum de ${(data.minOrder / 100).toFixed(0)} € requise.`);
        return;
      }
      setPromoResult({ id: snap.docs[0].id, ...data });
    } catch {
      setPromoError("Erreur lors de la vérification.");
    } finally {
      setPromoLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleAddressSelect(address: string, city: string, postalCode: string) {
    setForm((f) => ({ ...f, address, city, postalCode }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    if (deliveryType === "relay" && !selectedRelay) {
      setError("Veuillez sélectionner un point relais.");
      return;
    }
    setLoading(true); setError("");
    try {
      const orderId = generateOrderId();

      const shippingData = deliveryType === "relay"
        ? {
            type: "relay" as const,
            fullName: form.fullName,
            address: selectedRelay!.address,
            city: selectedRelay!.city,
            postalCode: selectedRelay!.postalCode,
            country: "France",
            relayPoint: selectedRelay,
          }
        : {
            type: "home" as const,
            fullName: form.fullName,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          };

      await addDoc(collection(db, "orders"), {
        id: orderId, userId: user?.uid ?? null, userEmail: form.email,
        status: "pending", items,
        shipping: shippingData,
        payment: { last4: form.cardNumber.replace(/\s/g, "").slice(-4), method: "card" },
        subtotal: total,
        discount,
        promoCode: promoResult?.code ?? null,
        shippingCost,
        total: finalTotal,
        createdAt: serverTimestamp(),
      });
      if (promoResult) {
        await updateDoc(doc(db, "promoCodes", promoResult.id), { usageCount: (promoResult as { usageCount?: number }).usageCount ?? 0 + 1 });
      }
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

          {/* ─── Mode de livraison ─── */}
          <section>
            <h2 className="font-serif font-semibold text-brown text-lg mb-5 flex items-center gap-2">
              <Package size={16} className="text-brown-light" /> Mode de livraison
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryType("home")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  deliveryType === "home"
                    ? "border-brown bg-sand"
                    : "border-border bg-cream hover:border-brown-mid"
                }`}
              >
                <Home size={18} className={deliveryType === "home" ? "text-brown mt-0.5" : "text-brown-light mt-0.5"} />
                <div>
                  <p className={`font-medium text-sm ${deliveryType === "home" ? "text-brown" : "text-brown-mid"}`}>
                    Livraison à domicile
                  </p>
                  <p className="text-xs text-brown-light mt-0.5">3-5 jours ouvrés · Offert</p>
                </div>
                {deliveryType === "home" && <Check size={16} className="text-brown ml-auto flex-shrink-0 mt-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType("relay")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  deliveryType === "relay"
                    ? "border-brown bg-sand"
                    : "border-border bg-cream hover:border-brown-mid"
                }`}
              >
                <Store size={18} className={deliveryType === "relay" ? "text-brown mt-0.5" : "text-brown-light mt-0.5"} />
                <div>
                  <p className={`font-medium text-sm ${deliveryType === "relay" ? "text-brown" : "text-brown-mid"}`}>
                    Point relais
                  </p>
                  <p className="text-xs text-brown-light mt-0.5">2-4 jours ouvrés · Offert</p>
                </div>
                {deliveryType === "relay" && <Check size={16} className="text-brown ml-auto flex-shrink-0 mt-0.5" />}
              </button>
            </div>
          </section>

          {/* ─── Adresse / Point relais ─── */}
          <section>
            {deliveryType === "home" ? (
              <>
                <h2 className="font-serif font-semibold text-brown text-lg mb-5">Adresse de livraison</h2>
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
              </>
            ) : (
              <>
                <h2 className="font-serif font-semibold text-brown text-lg mb-2">Choisir un point relais</h2>
                <p className="text-xs text-brown-light mb-5">Points relais disponibles près de chez vous (démo)</p>
                <div className="grid sm:grid-cols-2 gap-2 mb-5">
                  <Field label="Nom complet" name="fullName" value={form.fullName} onChange={handleChange} required />
                  <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  {RELAY_POINTS.map((relay) => (
                    <button
                      key={relay.id}
                      type="button"
                      onClick={() => setSelectedRelay(relay)}
                      className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedRelay?.id === relay.id
                          ? "border-brown bg-sand"
                          : "border-border bg-cream hover:border-brown-mid"
                      }`}
                    >
                      <Store size={16} className={`flex-shrink-0 mt-0.5 ${selectedRelay?.id === relay.id ? "text-brown" : "text-brown-light"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${selectedRelay?.id === relay.id ? "text-brown" : "text-brown-mid"}`}>
                          {relay.name}
                        </p>
                        <p className="text-xs text-brown-light mt-0.5">{relay.address}, {relay.postalCode} {relay.city}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {relay.distance && (
                          <span className="text-xs text-brown-light bg-sand border border-border rounded-lg px-2 py-0.5">
                            {relay.distance}
                          </span>
                        )}
                        {selectedRelay?.id === relay.id && <Check size={15} className="text-brown" />}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* ─── Paiement ─── */}
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
            {loading ? "Traitement en cours…" : `Payer ${formatPrice(finalTotal)}`}
          </button>
        </form>

        {/* ─── Récapitulatif ─── */}
        <div className="bg-sand border border-border rounded-2xl p-6 h-fit space-y-5">
          <h2 className="font-serif font-semibold text-brown">Votre commande</h2>
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.cartItemId} className="text-brown-light">
                <div className="flex justify-between">
                  <span className="truncate flex-1 pr-2">{item.name} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
                {item.customizationLabels && Object.keys(item.customizationLabels).length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {Object.entries(item.customizationLabels).map(([label, value]) => (
                      <span key={label} className="text-xs bg-cream border border-border rounded px-1.5 py-0.5">
                        {label} : {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Code promo */}
          <div className="border-t border-border pt-4 space-y-2">
            {promoResult ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <Check size={14} />
                  <span className="font-mono font-semibold">{promoResult.code}</span>
                  <span>−{promoResult.type === "percent" ? `${promoResult.value}%` : formatPrice(promoResult.value)}</span>
                </div>
                <button onClick={() => { setPromoResult(null); setPromoCode(""); }} className="text-green-600 hover:text-green-800">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brown-light" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyPromo())}
                    placeholder="Code promo"
                    className="w-full pl-8 pr-3 py-2.5 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition font-mono uppercase"
                  />
                </div>
                <button type="button" onClick={applyPromo} disabled={promoLoading || !promoCode.trim()}
                  className="px-4 py-2.5 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-40">
                  {promoLoading ? "…" : "OK"}
                </button>
              </div>
            )}
            {promoError && <p className="text-xs text-red-600">{promoError}</p>}
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm text-brown-light">
              <span>Sous-total</span>
              <span>{formatPrice(total)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-700 font-medium">
                <span>Réduction</span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-brown-light">
              <span>Livraison</span>
              <span className="text-green-700 font-medium">Offerte</span>
            </div>
            <div className="flex justify-between font-semibold text-brown pt-1 border-t border-border">
              <span>Total</span>
              <span className="text-terracotta text-lg">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Récapitulatif livraison */}
          {deliveryType === "relay" && selectedRelay && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-2">Point relais</p>
              <div className="flex items-start gap-2 text-xs text-brown-light">
                <Store size={12} className="flex-shrink-0 mt-0.5 text-terracotta" />
                <div>
                  <p className="font-medium text-brown-mid">{selectedRelay.name}</p>
                  <p>{selectedRelay.address}</p>
                  <p>{selectedRelay.postalCode} {selectedRelay.city}</p>
                </div>
              </div>
            </div>
          )}
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
