"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, generateOrderId } from "@/lib/utils";
import { track } from "@/lib/analytics";
import {
  FREE_SHIPPING_THRESHOLD, HOME_CARRIERS, RELAY_CARRIERS as CARRIERS,
  amountToFreeShipping, computeShippingCost, type DeliveryType,
} from "@/lib/shipping";
import type { RelayPoint } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Lock, MapPin, Tag, X, Check, Package, Home, Store, Search, Clock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import dynamic from "next/dynamic";

const RelayMap = dynamic(() => import("@/app/ui/relay-map"), { ssr: false });

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ─── Types API Adresse ─── */
interface BanFeature {
  properties: {
    label: string;
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
            : <MapPin size={15} className="text-brown-light" />}
        </div>
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-cream border border-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((f, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => { onSelect(f.properties.name, f.properties.city, f.properties.postcode); setSuggestions([]); setOpen(false); }}
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

/* ─── Logo transporteur ─── */
function CarrierBadge({ carrier }: { carrier: { abbr: string; bgColor: string; textColor?: string } }) {
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold flex-shrink-0"
      style={{
        backgroundColor: carrier.bgColor,
        color: carrier.textColor ?? "#FFFFFF",
      }}
    >
      {carrier.abbr}
    </span>
  );
}

/* ─── Page checkout ─── */
export default function CheckoutPage() {
  const { ready } = useCart();
  const { loading: authLoading } = useAuth();

  // Le formulaire se pré-remplit depuis le compte : on attend que panier et compte soient chargés
  if (!ready || authLoading) return <div className="bg-cream min-h-screen" />;
  return <CheckoutForm />;
}

function CheckoutForm() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  // Livraison
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("relay");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("mondial-relay");
  const [selectedHomeCarrierId, setSelectedHomeCarrierId] = useState<string>("colissimo");
  const [relaySearchCity, setRelaySearchCity] = useState("");
  const [relaySearchPostal, setRelaySearchPostal] = useState("");
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [relaySearched, setRelaySearched] = useState(false);
  const [relaySearchLoading, setRelaySearchLoading] = useState(false);
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);

  const selectedCarrier = CARRIERS.find((c) => c.id === selectedCarrierId) ?? CARRIERS[0];

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [verifiedTotal, setVerifiedTotal] = useState<number | null>(null);
  const [orderId] = useState(() => generateOrderId());
  // Accord pour recevoir un rappel par email si la commande n'est pas terminée
  const [cartReminder, setCartReminder] = useState(false);

  const [form, setForm] = useState({
    fullName: profile?.displayName ?? "",
    email: user?.email ?? "",
    address: "", city: "", postalCode: "", country: "France",
  });

  useEffect(() => {
    if (items.length === 0) return;
    track("begin_checkout", {
      value: total,
      items: items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pré-remplir la recherche relais depuis l'adresse domicile
  useEffect(() => {
    if (form.city && !relaySearchCity) setRelaySearchCity(form.city);
    if (form.postalCode && !relaySearchPostal) setRelaySearchPostal(form.postalCode);
  }, [form.city, form.postalCode]);

  const discount = promoResult
    ? promoResult.type === "percent"
      ? Math.round(total * promoResult.value / 100)
      : Math.min(total, promoResult.value)
    : 0;
  const afterDiscount = Math.max(0, total - discount);
  const activeCarrierId = deliveryType === "relay" ? selectedCarrierId : deliveryType === "home" ? selectedHomeCarrierId : undefined;
  const shippingCost = computeShippingCost(deliveryType, activeCarrierId, afterDiscount);
  const freeShippingReached = afterDiscount >= FREE_SHIPPING_THRESHOLD;
  const finalTotal = afterDiscount + shippingCost;
  // Une fois le paiement initialisé, le montant est figé : les choix ne sont plus modifiables
  const locked = clientSecret !== null;

  // Réinitialiser le point sélectionné si on change de transporteur
  useEffect(() => {
    setSelectedRelay(null);
    setRelayPoints([]);
    setRelaySearched(false);
  }, [selectedCarrierId]);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError(""); setPromoResult(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal: total }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error ?? "Code invalide ou expiré."); return; }
      setPromoResult(data);
    } catch {
      setPromoError("Erreur lors de la vérification.");
    } finally {
      setPromoLoading(false);
    }
  }

  /* Sauvegarde (ou supprime) le panier côté serveur pour le rappel par email */
  function syncCartReminder(consent: boolean) {
    const email = form.email.trim();
    if (!EMAIL_REGEX.test(email)) return;
    fetch("/api/cart/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        consent,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, customization: i.customization ?? {} })),
      }),
      keepalive: true,
    }).catch(() => {});
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleAddressSelect(address: string, city: string, postalCode: string) {
    setForm((f) => ({ ...f, address, city, postalCode }));
    if (!relaySearchCity) setRelaySearchCity(city);
    if (!relaySearchPostal) setRelaySearchPostal(postalCode);
  }

  async function searchRelayPoints() {
    if (!relaySearchPostal.trim()) return;
    setRelaySearchLoading(true);
    setSelectedRelay(null);
    try {
      const res = await fetch(`/api/mondial-relay?cp=${encodeURIComponent(relaySearchPostal.trim())}&pays=FR`);
      const data = await res.json();
      if (data.points && data.points.length > 0) {
        setRelayPoints(data.points);
      } else {
        setRelayPoints([]);
      }
    } catch {
      setRelayPoints([]);
    } finally {
      setRelaySearched(true);
      setRelaySearchLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    if (!EMAIL_REGEX.test(form.email.trim())) { setError("L'adresse email saisie n'est pas valide."); return; }
    const postalRegex = /^\d{5}$/;
    if (deliveryType === "home" && !postalRegex.test(form.postalCode)) { setError("Le code postal doit contenir exactement 5 chiffres."); return; }
    if (deliveryType === "relay" && !selectedRelay) { setError("Veuillez sélectionner un point relais."); return; }
    if (!form.fullName.trim()) { setError("Veuillez entrer votre nom complet."); return; }

    setLoading(true); setError("");
    try {
      const deliveryData = deliveryType === "relay"
        ? { relayPoint: selectedRelay }
        : deliveryType === "home"
        ? { address: form.address, city: form.city, postal: form.postalCode }
        : {};
      const idToken = user ? await user.getIdToken() : null;
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
        body: JSON.stringify({
          orderId,
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          deliveryType,
          carrierId: activeCarrierId,
          promoCode: promoResult?.code ?? undefined,
          items: items.map((i) => ({
            cartItemId: i.cartItemId,
            productId: i.productId,
            quantity: i.quantity,
            customization: i.customization ?? {},
          })),
          ...deliveryData,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        // Les refus (stock, personnalisation manquante…) portent un message destiné au client
        setError(res.status < 500 && data.error ? data.error : "Impossible d'initialiser le paiement. Veuillez réessayer.");
        return;
      }
      setClientSecret(data.clientSecret);
      setVerifiedTotal(data.verifiedAmount ?? finalTotal);
      if (cartReminder) syncCartReminder(true);
    } catch (err) {
      console.error("[checkout] Erreur PaymentIntent:", err);
      setError("Impossible d'initialiser le paiement. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  // La commande est enregistrée côté serveur à partir du paiement (page de confirmation,
  // avec le webhook Stripe en filet de sécurité) : ici, on ne fait que passer la main.
  async function confirmOrder(paymentIntentId: string) {
    track("purchase", {
      orderId,
      value: verifiedTotal ?? finalTotal,
      items: items.map((i) => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
    });
    clearCart();
    router.push(`/confirmation/${orderId}?pi=${paymentIntentId}`);
  }

  function editDelivery() {
    setClientSecret(null);
    setVerifiedTotal(null);
    setError("");
  }

  const reminderOption = (
    <label className="sm:col-span-2 flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={cartReminder}
        onChange={(e) => { setCartReminder(e.target.checked); syncCartReminder(e.target.checked); }}
        className="w-4 h-4 mt-0.5 rounded accent-terracotta flex-shrink-0"
      />
      <span className="text-xs text-brown-light leading-relaxed">
        Me rappeler mon panier par email si je ne termine pas ma commande (3 messages au plus, désinscription en un clic).
      </span>
    </label>
  );

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
        <form onSubmit={handleSubmit} className={`lg:col-span-2 space-y-8 ${locked ? "opacity-60 pointer-events-none" : ""}`}>

          {/* ─── Mode de livraison ─── */}
          <section>
            <h2 className="font-serif font-semibold text-brown text-lg mb-5 flex items-center gap-2">
              <Package size={16} className="text-brown-light" /> Mode de livraison
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-4 rounded-2xl border-2 border-border bg-cream/50 opacity-50 cursor-not-allowed select-none">
                <Home size={18} className="text-brown-light mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-brown-mid">Livraison à domicile</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Bientôt disponible</span>
                  </div>
                  <p className="text-xs text-brown-light mt-0.5">Colissimo · DPD</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeliveryType("relay")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  deliveryType === "relay" ? "border-brown bg-sand" : "border-border bg-cream hover:border-brown-mid"
                }`}
              >
                <Store size={18} className={deliveryType === "relay" ? "text-brown mt-0.5" : "text-brown-light mt-0.5"} />
                <div>
                  <p className={`font-medium text-sm ${deliveryType === "relay" ? "text-brown" : "text-brown-mid"}`}>Point relais</p>
                  <p className="text-xs text-brown-light mt-0.5">Mondial Relay</p>
                </div>
                {deliveryType === "relay" && <Check size={16} className="text-brown ml-auto flex-shrink-0 mt-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType("pickup")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  deliveryType === "pickup" ? "border-brown bg-sand" : "border-border bg-cream hover:border-brown-mid"
                }`}
              >
                <MapPin size={18} className={deliveryType === "pickup" ? "text-brown mt-0.5" : "text-brown-light mt-0.5"} />
                <div>
                  <p className={`font-medium text-sm ${deliveryType === "pickup" ? "text-brown" : "text-brown-mid"}`}>En main propre</p>
                  <p className="text-xs text-brown-light mt-0.5">Gratuit · Sur rendez-vous</p>
                </div>
                {deliveryType === "pickup" && <Check size={16} className="text-brown ml-auto flex-shrink-0 mt-0.5" />}
              </button>
            </div>
          </section>

          {/* ─── Section en main propre ─── */}
          {deliveryType === "pickup" && (
            <section className="space-y-6">
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-4">Vos coordonnées</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nom complet" name="fullName" value={form.fullName} onChange={handleChange} required />
                  <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} onBlur={() => { if (cartReminder) syncCartReminder(true); }} required />
                  {reminderOption}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Remise en main propre</p>
                <p className="text-xs">Nous vous contacterons par email pour convenir d&apos;un rendez-vous. Livraison gratuite.</p>
              </div>
            </section>
          )}

          {/* ─── Section domicile ─── */}
          {deliveryType === "home" && (
            <section className="space-y-6">
              {/* Choix transporteur domicile */}
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-4">Transporteur</h2>
                <div className="grid grid-cols-3 gap-2">
                  {HOME_CARRIERS.map((carrier) => (
                    carrier.available ? (
                      <button
                        key={carrier.id}
                        type="button"
                        onClick={() => setSelectedHomeCarrierId(carrier.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          selectedHomeCarrierId === carrier.id ? "border-brown bg-sand" : "border-border bg-cream hover:border-brown-mid"
                        }`}
                      >
                        <CarrierBadge carrier={carrier} />
                        <div className="text-center">
                          <p className={`text-xs font-semibold ${selectedHomeCarrierId === carrier.id ? "text-brown" : "text-brown-mid"}`}>{carrier.name}</p>
                          <p className="text-xs text-brown-light mt-0.5">{carrier.desc}</p>
                          <p className="text-xs font-medium mt-0.5 text-terracotta">{formatPrice(carrier.price)}</p>
                        </div>
                        {selectedHomeCarrierId === carrier.id && <Check size={13} className="text-brown" />}
                      </button>
                    ) : (
                      <div
                        key={carrier.id}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-border bg-cream/50 opacity-50 cursor-not-allowed"
                      >
                        <CarrierBadge carrier={carrier} />
                        <div className="text-center">
                          <p className="text-xs font-semibold text-brown-mid">{carrier.name}</p>
                          <p className="text-xs text-brown-light mt-0.5">{carrier.desc}</p>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 mt-1 inline-block">Indisponible</span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Adresse */}
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-4">Adresse de livraison</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nom complet" name="fullName" value={form.fullName} onChange={handleChange} required />
                  <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} onBlur={() => { if (cartReminder) syncCartReminder(true); }} required />
                  {reminderOption}
                  <div className="sm:col-span-2">
                    <AddressAutocomplete value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} onSelect={handleAddressSelect} />
                  </div>
                  <Field label="Ville" name="city" value={form.city} onChange={handleChange} required />
                  <Field label="Code postal" name="postalCode" value={form.postalCode} onChange={handleChange} required />
                  <div className="sm:col-span-2">
                    <Field label="Pays" name="country" value={form.country} onChange={handleChange} required />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ─── Section point relais ─── */}
          {deliveryType === "relay" && (
            <section className="space-y-6">
              {/* Coordonnées */}
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-4">Vos coordonnées</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nom complet" name="fullName" value={form.fullName} onChange={handleChange} required />
                  <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} onBlur={() => { if (cartReminder) syncCartReminder(true); }} required />
                  {reminderOption}
                </div>
              </div>

              {/* Choix du transporteur */}
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-4">Transporteur</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CARRIERS.map((carrier) => {
                    const available = carrier.id === "mondial-relay";
                    return available ? (
                      <button
                        key={carrier.id}
                        type="button"
                        onClick={() => setSelectedCarrierId(carrier.id)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          selectedCarrierId === carrier.id ? "border-brown bg-sand" : "border-border bg-cream hover:border-brown-mid"
                        }`}
                      >
                        <CarrierBadge carrier={carrier} />
                        <div className="text-center">
                          <p className={`text-xs font-semibold ${selectedCarrierId === carrier.id ? "text-brown" : "text-brown-mid"}`}>
                            {carrier.name}
                          </p>
                          <p className="text-xs text-brown-light mt-0.5">{carrier.desc}</p>
                          <p className={`text-xs font-medium mt-0.5 ${freeShippingReached ? "text-green-700" : "text-terracotta"}`}>
                            {freeShippingReached ? "Offert" : formatPrice(carrier.price)}
                          </p>
                        </div>
                        {selectedCarrierId === carrier.id && <Check size={13} className="text-brown" />}
                      </button>
                    ) : (
                      <div
                        key={carrier.id}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-border bg-cream/50 opacity-50 cursor-not-allowed"
                      >
                        <CarrierBadge carrier={carrier} />
                        <div className="text-center">
                          <p className="text-xs font-semibold text-brown-mid">{carrier.name}</p>
                          <p className="text-xs text-brown-light mt-0.5">{carrier.desc}</p>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 mt-1 inline-block">
                            Indisponible
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recherche points relais */}
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-2">
                  Points relais {selectedCarrier.name}
                </h2>
                <p className="text-xs text-brown-light mb-4">
                  Entrez votre code postal pour trouver les points Mondial Relay les plus proches.
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={relaySearchPostal}
                    onChange={(e) => setRelaySearchPostal(e.target.value)}
                    placeholder="Code postal (ex: 75001)"
                    maxLength={5}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className="flex-1 px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition"
                  />
                  <button
                    type="button"
                    onClick={searchRelayPoints}
                    disabled={relaySearchLoading || relaySearchPostal.trim().length < 5}
                    className="flex items-center gap-2 px-4 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-40"
                  >
                    {relaySearchLoading
                      ? <div className="w-4 h-4 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
                      : <Search size={15} />}
                    Rechercher
                  </button>
                </div>

                {/* Résultats */}
                {relaySearchLoading && (
                  <div className="flex items-center justify-center py-10 gap-3 text-brown-light text-sm">
                    <div className="w-5 h-5 border-2 border-border border-t-terracotta rounded-full animate-spin" />
                    Recherche des points {selectedCarrier.name} à proximité…
                  </div>
                )}

                {relaySearched && !relaySearchLoading && relayPoints.length > 0 && (
                  <div className="space-y-4">
                    {/* Carte */}
                    <RelayMap
                      points={relayPoints}
                      selected={selectedRelay}
                      onSelect={setSelectedRelay}
                    />
                    {/* Liste */}
                    <div className="space-y-2">
                      {relayPoints.map((relay) => (
                        <button
                          key={relay.id}
                          type="button"
                          onClick={() => setSelectedRelay(relay)}
                          className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                            selectedRelay?.id === relay.id ? "border-brown bg-sand" : "border-border bg-cream hover:border-brown-mid"
                          }`}
                        >
                          <CarrierBadge carrier={selectedCarrier} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${selectedRelay?.id === relay.id ? "text-brown" : "text-brown-mid"}`}>
                              {relay.name}
                            </p>
                            <p className="text-xs text-brown-light mt-0.5">{relay.address}, {relay.postalCode} {relay.city}</p>
                            {relay.hours && (
                              <p className="text-xs text-brown-light mt-1 flex items-center gap-1">
                                <Clock size={10} className="flex-shrink-0" /> {relay.hours}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end gap-1">
                            {relay.distance && (
                              <span className="text-xs font-medium text-terracotta">{relay.distance}</span>
                            )}
                            {selectedRelay?.id === relay.id && <Check size={15} className="text-brown" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {relaySearched && !relaySearchLoading && relayPoints.length === 0 && (
                  <p className="text-sm text-brown-light text-center py-6">Aucun point relais trouvé. Essayez une autre ville.</p>
                )}
              </div>
            </section>
          )}

          {/* ─── Bouton procéder au paiement ─── */}
          {!clientSecret && (
            <>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 bg-brown text-cream font-medium rounded-2xl hover:bg-brown-mid transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                <Lock size={14} />
                {loading ? "Initialisation…" : `Procéder au paiement · ${formatPrice(finalTotal)}`}
              </button>
            </>
          )}
        </form>

        {/* ─── Formulaire Stripe — hors du form principal pour éviter les conflits ─── */}
        {clientSecret && (
          <div className="lg:col-span-2">
            <Elements stripe={stripePromise} options={{ clientSecret, locale: "fr", appearance: { theme: "stripe", variables: { colorPrimary: "#3d2b1f", borderRadius: "12px", fontFamily: "inherit" } } }}>
              <StripePaymentForm
                onSuccess={confirmOrder}
                onError={setError}
                finalTotal={verifiedTotal ?? finalTotal}
                orderId={orderId}
              />
            </Elements>
            <button
              type="button"
              onClick={editDelivery}
              className="mt-4 mx-auto block text-sm text-brown-light hover:text-terracotta underline underline-offset-2 transition-colors"
            >
              Modifier mes informations de livraison
            </button>
          </div>
        )}

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
          <div className={`border-t border-border pt-4 space-y-2 ${locked ? "opacity-60 pointer-events-none" : ""}`}>
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
              <span>Sous-total</span><span>{formatPrice(total)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-700 font-medium">
                <span>Réduction</span><span>−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-brown-light">
              <span>Livraison</span>
              {shippingCost === 0
                ? <span className="text-green-700 font-medium">Offerte</span>
                : <span>{formatPrice(shippingCost)}</span>}
            </div>
            {shippingCost > 0 && (
              <p className="text-xs text-brown-light">
                Plus que {formatPrice(amountToFreeShipping(afterDiscount))} pour la livraison offerte.
              </p>
            )}
            <div className="flex justify-between font-semibold text-brown pt-1 border-t border-border">
              <span>Total</span>
              <span className="text-terracotta text-lg">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Récap point relais sélectionné */}
          {deliveryType === "relay" && selectedRelay && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-2">Point relais</p>
              <div className="flex items-start gap-2 text-xs text-brown-light">
                <CarrierBadge carrier={selectedCarrier} />
                <div className="ml-1">
                  <p className="font-medium text-brown-mid">{selectedRelay.name}</p>
                  <p>{selectedRelay.address}</p>
                  <p>{selectedRelay.postalCode} {selectedRelay.city}</p>
                  {selectedRelay.hours && <p className="mt-0.5 text-brown-light">{selectedRelay.hours}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StripePaymentForm({ onSuccess, onError, finalTotal, orderId }: {
  onSuccess: (paymentIntentId: string) => Promise<void>;
  onError: (msg: string) => void;
  finalTotal: number;
  orderId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [localError, setLocalError] = useState("");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true); setLocalError("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        // Certains moyens de paiement (PayPal…) passent par une redirection : retour sur la confirmation
        confirmParams: { return_url: `${window.location.origin}/confirmation/${orderId}` },
        redirect: "if_required",
      });
      if (error) {
        setLocalError(error.message ?? "Paiement refusé. Veuillez réessayer.");
        onError(error.message ?? "Paiement refusé.");
      } else if (paymentIntent?.status === "succeeded") {
        try {
          await onSuccess(paymentIntent.id);
        } catch (confirmErr: unknown) {
          const msg = confirmErr instanceof Error ? confirmErr.message : String(confirmErr);
          console.error("[checkout] confirmOrder failed after payment:", msg);
          setLocalError("Votre paiement a été accepté mais une erreur est survenue lors de l'enregistrement de la commande. Notez votre référence de paiement : " + paymentIntent.id + " et contactez-nous. (Erreur: " + msg + ")");
        }
      }
    } catch {
      setLocalError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div className="border border-border rounded-2xl p-5 bg-white">
        <h2 className="font-serif font-semibold text-brown text-lg mb-4 flex items-center gap-2">
          <Lock size={15} className="text-brown-light" /> Paiement sécurisé
        </h2>
        <PaymentElement />
      </div>
      {localError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{localError}</p>}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full py-4 bg-brown text-cream font-medium rounded-2xl hover:bg-brown-mid transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
      >
        <Lock size={14} />
        {paying ? "Paiement en cours…" : `Payer ${formatPrice(finalTotal)}`}
      </button>
      <p className="text-xs text-center text-brown-light flex items-center justify-center gap-1">
        <Lock size={10} /> Paiement sécurisé par Stripe — vos données bancaires ne nous sont jamais transmises
      </p>
    </form>
  );
}

/* Saisie automatique du navigateur : moins de frappe, surtout sur mobile */
const AUTOCOMPLETE: Record<string, string> = {
  fullName: "name",
  email: "email",
  city: "address-level2",
  postalCode: "postal-code",
  country: "country-name",
};

function Field({ label, name, value, onChange, onBlur, type = "text", placeholder, required }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-brown-mid mb-1.5">
        {label}{required && <span className="text-terracotta ml-0.5">*</span>}
      </label>
      <input id={name} name={name} type={type} value={value} onChange={onChange} onBlur={onBlur} placeholder={placeholder} required={required}
        autoComplete={AUTOCOMPLETE[name]}
        className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition"
      />
    </div>
  );
}
