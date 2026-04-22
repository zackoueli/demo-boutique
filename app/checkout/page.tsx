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
import { ArrowLeft, Lock, MapPin, Tag, X, Check, Package, Home, Store, Search, Clock } from "lucide-react";

/* ─── Seuil livraison offerte ─── */
const FREE_SHIPPING_THRESHOLD = 8000; // 80€ en centimes
const HOME_DELIVERY_PRICE = 599;      // 5,99€

/* ─── Transporteurs disponibles ─── */
const CARRIERS = [
  {
    id: "mondial-relay",
    name: "Mondial Relay",
    abbr: "MR",
    bgColor: "#E30613",
    desc: "2–4 jours ouvrés",
    price: 399,
  },
  {
    id: "colissimo",
    name: "Colissimo",
    abbr: "COL",
    bgColor: "#FFCD00",
    textColor: "#003189",
    desc: "2–3 jours ouvrés",
    price: 599,
  },
  {
    id: "chronopost",
    name: "Chronopost",
    abbr: "CHR",
    bgColor: "#003189",
    desc: "1–2 jours ouvrés",
    price: 999,
  },
  {
    id: "dpd",
    name: "DPD",
    abbr: "DPD",
    bgColor: "#DC0032",
    desc: "2–3 jours ouvrés",
    price: 499,
  },
];

/* ─── Génération dynamique de points relais ─── */
const SHOP_TYPES = [
  "Tabac Presse", "Épicerie Fine", "Pharmacie", "Librairie Papeterie",
  "Pressing Express", "Supérette", "Bureau de Tabac", "Boulangerie",
  "Droguerie", "Fleuriste", "Opticien", "Cordonnerie",
];
const STREET_TYPES = [
  "rue", "avenue", "boulevard", "impasse", "allée", "place", "chemin",
];
const STREET_NAMES = [
  "de la République", "Victor Hugo", "du Général de Gaulle", "Jean Jaurès",
  "de la Liberté", "du Marché", "des Fleurs", "Nationale", "Gambetta",
  "Foch", "Pasteur", "de la Gare", "du Commerce", "des Écoles",
];
const HOURS = [
  "Lun–Sam 7h–20h", "Lun–Ven 8h–19h, Sam 9h–18h",
  "Lun–Sam 8h–21h, Dim 9h–13h", "Lun–Ven 9h–18h30",
  "7j/7 8h–22h", "Lun–Sam 9h–19h30",
];

function generateRelayPoints(city: string, postalCode: string, carrier: string): RelayPoint[] {
  // Seed déterministe basé sur le code postal pour des résultats cohérents
  const seed = postalCode.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const carrierSeed = carrier.length;

  return Array.from({ length: 6 }, (_, i) => {
    const s = (seed + i * 37 + carrierSeed * 13) % 1000;
    const shopType = SHOP_TYPES[(s + i * 7) % SHOP_TYPES.length];
    const streetNum = ((s * (i + 1)) % 120) + 1;
    const streetType = STREET_TYPES[(s + i) % STREET_TYPES.length];
    const streetName = STREET_NAMES[(s * 3 + i * 11) % STREET_NAMES.length];
    const dist = ((s % 18) + i * 3 + 1) / 10;
    const hours = HOURS[(s + i * 3) % HOURS.length];
    // Variation légère du CP pour les résultats distants
    const cpSuffix = i < 3 ? postalCode : String(parseInt(postalCode) + (i % 2 === 0 ? 1 : -1)).padStart(5, "0");

    return {
      id: `${carrier}-${postalCode}-${i}`,
      name: `${shopType} ${city.split(" ")[0]}`,
      address: `${streetNum} ${streetType} ${streetName}`,
      city,
      postalCode: cpSuffix,
      distance: `${dist.toFixed(1)} km`,
      hours,
    };
  });
}

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
function CarrierBadge({ carrier }: { carrier: typeof CARRIERS[0] }) {
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
  const [deliveryType, setDeliveryType] = useState<"home" | "relay">("home");
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("mondial-relay");
  const [relaySearchCity, setRelaySearchCity] = useState("");
  const [relaySearchPostal, setRelaySearchPostal] = useState("");
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [relaySearched, setRelaySearched] = useState(false);
  const [relaySearchLoading, setRelaySearchLoading] = useState(false);
  const [selectedRelay, setSelectedRelay] = useState<RelayPoint | null>(null);

  const selectedCarrier = CARRIERS.find((c) => c.id === selectedCarrierId) ?? CARRIERS[0];

  const [form, setForm] = useState({
    fullName: profile?.displayName ?? "",
    email: user?.email ?? "",
    address: "", city: "", postalCode: "", country: "France",
    cardNumber: "", cardExpiry: "", cardCvc: "",
  });

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
  const homeDeliveryCost = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : HOME_DELIVERY_PRICE;
  const shippingCost = deliveryType === "relay" ? selectedCarrier.price : homeDeliveryCost;
  const finalTotal = afterDiscount + shippingCost;

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
    if (!relaySearchCity) setRelaySearchCity(city);
    if (!relaySearchPostal) setRelaySearchPostal(postalCode);
  }

  function searchRelayPoints() {
    if (!relaySearchPostal.trim() || !relaySearchCity.trim()) return;
    setRelaySearchLoading(true);
    setSelectedRelay(null);
    setTimeout(() => {
      const points = generateRelayPoints(relaySearchCity.trim(), relaySearchPostal.trim(), selectedCarrierId);
      setRelayPoints(points);
      setRelaySearched(true);
      setRelaySearchLoading(false);
    }, 800); // Simule un appel réseau
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    // Validation JS avant soumission
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(form.email)) {
      setError("L'adresse email saisie n'est pas valide.");
      return;
    }
    const postalRegex = /^\d{5}$/;
    if (deliveryType === "home" && !postalRegex.test(form.postalCode)) {
      setError("Le code postal doit contenir exactement 5 chiffres.");
      return;
    }
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
            carrier: selectedCarrier.name,
          }
        : {
            type: "home" as const,
            fullName: form.fullName,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          };

      // Firestore rejette les valeurs undefined — on nettoie les items
      const sanitizedItems = items.map((item) => {
        const clean: Record<string, unknown> = {
          cartItemId: item.cartItemId,
          productId: item.productId,
          name: item.name,
          price: item.price,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
        };
        if (item.customization) clean.customization = item.customization;
        if (item.customizationLabels) clean.customizationLabels = item.customizationLabels;
        if (item.customizationExtra) clean.customizationExtra = item.customizationExtra;
        return clean;
      });

      await addDoc(collection(db, "orders"), {
        id: orderId, userId: user?.uid ?? null, userEmail: form.email,
        status: "pending", items: sanitizedItems,
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
        await updateDoc(doc(db, "promoCodes", promoResult.id), { usageCount: ((promoResult as { usageCount?: number }).usageCount ?? 0) + 1 });
      }
      await Promise.all(
        items.map(async (item) => {
          const productRef = doc(db, "products", item.productId);
          const snap = await getDoc(productRef);
          if (snap.exists()) {
            const newStock = Math.max(0, (snap.data().stock ?? 0) - item.quantity);
            await updateDoc(productRef, { stock: newStock });
          }
        })
      );
      // Envoi email de confirmation (fire & forget — ne bloque pas la redirection)
      fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          userEmail: form.email,
          items: sanitizedItems,
          shipping: shippingData,
          subtotal: total,
          shippingCost,
          discount,
          promoCode: promoResult?.code ?? null,
          total: finalTotal,
        }),
      }).catch(() => {}); // échec silencieux côté client

      clearCart();
      router.push(`/confirmation/${orderId}`);
    } catch (err) {
      console.error("[checkout] Erreur lors de la création de commande:", err);
      if (err instanceof Error && err.message.includes("permission")) {
        setError("Erreur d'autorisation. Veuillez vous reconnecter et réessayer.");
      } else if (err instanceof Error && err.message.includes("network")) {
        setError("Erreur réseau. Vérifiez votre connexion internet.");
      } else {
        setError("Une erreur est survenue lors de la création de votre commande. Veuillez réessayer.");
      }
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
                  deliveryType === "home" ? "border-brown bg-sand" : "border-border bg-cream hover:border-brown-mid"
                }`}
              >
                <Home size={18} className={deliveryType === "home" ? "text-brown mt-0.5" : "text-brown-light mt-0.5"} />
                <div>
                  <p className={`font-medium text-sm ${deliveryType === "home" ? "text-brown" : "text-brown-mid"}`}>Livraison à domicile</p>
                  <p className="text-xs text-brown-light mt-0.5">
                    3–5 jours ouvrés ·{" "}
                    {homeDeliveryCost === 0
                      ? <span className="text-green-700 font-medium">Offerte</span>
                      : <span>{formatPrice(HOME_DELIVERY_PRICE)} <span className="text-brown-light">(offerte dès 80 €)</span></span>
                    }
                  </p>
                </div>
                {deliveryType === "home" && <Check size={16} className="text-brown ml-auto flex-shrink-0 mt-0.5" />}
              </button>

              <div
                className="flex items-start gap-3 p-4 rounded-2xl border-2 border-border bg-cream/50 text-left opacity-50 cursor-not-allowed select-none"
              >
                <Store size={18} className="text-brown-light mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-brown-light">Point relais</p>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Indisponible</span>
                  </div>
                  <p className="text-xs text-brown-light mt-0.5">Mondial Relay · Colissimo · Chronopost</p>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Section domicile ─── */}
          {deliveryType === "home" && (
            <section>
              <h2 className="font-serif font-semibold text-brown text-lg mb-5">Adresse de livraison</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom complet" name="fullName" value={form.fullName} onChange={handleChange} required />
                <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                <div className="sm:col-span-2">
                  <AddressAutocomplete value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} onSelect={handleAddressSelect} />
                </div>
                <Field label="Ville" name="city" value={form.city} onChange={handleChange} required />
                <Field label="Code postal" name="postalCode" value={form.postalCode} onChange={handleChange} required />
                <div className="sm:col-span-2">
                  <Field label="Pays" name="country" value={form.country} onChange={handleChange} required />
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
                  <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
              </div>

              {/* Choix du transporteur */}
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-4">Transporteur</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CARRIERS.map((carrier) => (
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
                        <p className={`text-xs font-medium mt-0.5 ${carrier.price === 0 ? "text-green-700" : "text-terracotta"}`}>
                          {carrier.price === 0 ? "Offert" : formatPrice(carrier.price)}
                        </p>
                      </div>
                      {selectedCarrierId === carrier.id && <Check size={13} className="text-brown" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recherche points relais */}
              <div>
                <h2 className="font-serif font-semibold text-brown text-lg mb-2">
                  Points relais {selectedCarrier.name}
                </h2>
                <p className="text-xs text-brown-light mb-4">
                  Entrez votre ville et code postal pour trouver les points les plus proches.
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={relaySearchCity}
                    onChange={(e) => setRelaySearchCity(e.target.value)}
                    placeholder="Ville"
                    className="flex-1 px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition"
                  />
                  <input
                    type="text"
                    value={relaySearchPostal}
                    onChange={(e) => setRelaySearchPostal(e.target.value)}
                    placeholder="Code postal"
                    maxLength={5}
                    className="w-32 px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition"
                  />
                  <button
                    type="button"
                    onClick={searchRelayPoints}
                    disabled={relaySearchLoading || !relaySearchCity.trim() || !relaySearchPostal.trim()}
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
                )}

                {relaySearched && !relaySearchLoading && relayPoints.length === 0 && (
                  <p className="text-sm text-brown-light text-center py-6">Aucun point relais trouvé. Essayez une autre ville.</p>
                )}
              </div>
            </section>
          )}

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
