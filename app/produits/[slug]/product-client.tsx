"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product, CustomizationField } from "@/lib/types";
import { useCart, buildCartItemId, quantityInCart } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import { formatPrice } from "@/lib/utils";
import { calcExtra, optionExtra, optionLabel } from "@/lib/customization";
import { DEFAULT_SHIPPING_PRICE, FREE_SHIPPING_THRESHOLD, PREPARATION_DELAY } from "@/lib/shipping";
import { SITE_URL } from "@/lib/site";
import { track } from "@/lib/analytics";
import { useRating } from "@/lib/ratings";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, CheckCircle, Clock, Truck, Lock, RotateCcw, MessageCircle, Star } from "lucide-react";
import ImageCarousel from "@/app/ui/image-carousel";
import ProductCard from "@/app/ui/product-card";
import ProductReviews from "@/app/ui/product-reviews";
import WishlistButton from "@/app/ui/wishlist-button";
import ShareButtons from "@/app/ui/share-buttons";
import { useCategories } from "@/lib/categories";

type Tab = "description" | "materials" | "care";

/* ─── Rendu d'un champ de personnalisation ─── */
function CustomizationInput({
  field,
  value,
  onChange,
  hasError = false,
}: {
  field: CustomizationField;
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const errorCls = hasError ? "border-red-400 ring-1 ring-red-300" : "";

  if (field.type === "text") {
    return (
      <div>
        <label className="block text-sm font-medium text-brown-mid mb-1.5 flex items-center gap-2">
          {field.label}{field.required && <span className="text-terracotta">*</span>}
          {field.extraPrice && field.extraPrice > 0 && (
            <span className="text-xs font-normal text-terracotta bg-terracotta/10 px-1.5 py-0.5 rounded-md">
              +{formatPrice(field.extraPrice)}
            </span>
          )}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Votre ${field.label.toLowerCase()}`}
          required={field.required}
          className={`w-full px-4 py-3 border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition ${errorCls || "border-border"}`}
        />
        {hasError && <p className="text-xs text-red-500 mt-1">Ce champ est obligatoire</p>}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="block text-sm font-medium text-brown-mid mb-1.5">
          {field.label}{field.required && <span className="text-terracotta ml-0.5">*</span>}
        </label>
        {hasError && <p className="text-xs text-red-500 mb-1">Ce champ est obligatoire</p>}
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const label = optionLabel(opt);
            const extra = optionExtra(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(label)}
                className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                  value === label
                    ? "border-brown bg-brown text-cream"
                    : "border-border bg-sand text-brown-mid hover:border-brown-mid"
                }`}
              >
                {label}
                {extra > 0 && (
                  <span className={`ml-1.5 text-xs ${value === label ? "text-cream/70" : "text-terracotta"}`}>
                    +{formatPrice(extra)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "color") {
    const COLOR_MAP: Record<string, string> = {
      "Or": "#D4AF37", "Doré": "#FFD700", "Or rose": "#E8A090",
      "Argent": "#C0C0C0", "Argenté": "#A8A8A8",
      "Bronze": "#CD7F32", "Cuivre": "#B87333",
      "Blanc": "#FFFFFF", "Crème": "#FFF8F0", "Ivoire": "#FFFFF0",
      "Noir": "#1A1A1A", "Gris": "#808080", "Gris clair": "#D3D3D3",
      "Rouge": "#E53935", "Rouge bordeaux": "#800020", "Bordeaux": "#722F37",
      "Rose": "#F4A7B9", "Rose poudré": "#F8C8D4", "Rose fuchsia": "#FF69B4",
      "Orange": "#FF8C00", "Corail": "#FF6B6B", "Saumon": "#FA8072",
      "Jaune": "#FFD600", "Jaune doré": "#F5C518",
      "Terracotta": "#C76442",
      "Bleu": "#1976D2", "Bleu marine": "#002366", "Bleu ciel": "#87CEEB",
      "Bleu turquoise": "#40E0D0", "Turquoise": "#30D5C8",
      "Vert": "#2E7D32", "Vert sauge": "#8FBC8B", "Vert menthe": "#98FF98",
      "Violet": "#7B1FA2", "Mauve": "#C8A2C8", "Lilas": "#C8A2C8",
      "Lavande": "#E6E6FA",
      "Marron": "#795548", "Caramel": "#C68642", "Beige": "#F5F5DC",
      "Nude": "#E8C9A0",
    };

    function resolveColor(label: string): string {
      if (label.startsWith("#") || label.startsWith("rgb")) return label;
      return COLOR_MAP[label] ?? "#E0D5C8";
    }
    function isLight(label: string): boolean {
      const hex = resolveColor(label).replace("#", "");
      if (hex.length < 6) return false;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 180;
    }

    return (
      <div>
        <label className="block text-sm font-medium text-brown-mid mb-1.5">
          {field.label}{field.required && <span className="text-terracotta ml-0.5">*</span>}
        </label>
        {hasError && <p className="text-xs text-red-500 mb-1">Ce champ est obligatoire</p>}
        <div className="flex flex-wrap gap-3">
          {field.options?.map((opt) => {
            const label = optionLabel(opt);
            const extra = optionExtra(opt);
            return (
              <div key={opt} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  title={label}
                  onClick={() => onChange(label)}
                  className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                    value === label ? "border-brown scale-110 shadow-md" : "border-border hover:border-brown-mid"
                  }`}
                  style={{ backgroundColor: resolveColor(label) }}
                >
                  {value === label && (
                    <CheckCircle size={14} className={isLight(label) ? "text-brown" : "text-white"} />
                  )}
                </button>
                {extra > 0 && (
                  <span className="text-xs text-terracotta font-medium">+{formatPrice(extra)}</span>
                )}
              </div>
            );
          })}
        </div>
        {value && <p className="text-xs text-brown-mid mt-2">Sélectionné : <span className="font-medium">{value}</span></p>}
      </div>
    );
  }

  return null;
}

export default function ProductClient({ product: initialProduct }: { product: Product }) {
  const { categories } = useCategories();
  // Le produit arrive déjà rendu par le serveur ; il est rafraîchi ensuite pour un stock à jour
  const [product, setProduct] = useState<Product>(initialProduct);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>("description");
  const [customization, setCustomization] = useState<Record<string, string>>({});
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
  const { addItem, items } = useCart();
  const { showToast } = useToast();
  const rating = useRating(product.id);

  const productId = initialProduct.id;
  const category = initialProduct.category;
  const relatedIds = (initialProduct.relatedProductIds ?? []).join(",");

  useEffect(() => {
    track("view_item", {
      value: initialProduct.price,
      items: [{ id: initialProduct.id, name: initialProduct.name, price: initialProduct.price, quantity: 1 }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    let active = true;
    getDoc(doc(db, "products", productId)).then((snap) => {
      if (active && snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product);
    }).catch(() => {});

    // Compléments choisis à la main dans l'admin
    Promise.all(relatedIds.split(",").filter(Boolean).map((id) => getDoc(doc(db, "products", id))))
      .then((snaps) => {
        if (active) setRelated(snaps.filter((d) => d.exists()).map((d) => ({ id: d.id, ...d.data() } as Product)));
      })
      .catch(() => {});

    getDocs(query(collection(db, "products"), where("category", "==", category), limit(8))).then((simSnap) => {
      if (!active) return;
      const excluded = new Set([productId, ...relatedIds.split(",")]);
      setSimilar(
        simSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)).filter((s) => !excluded.has(s.id)).slice(0, 4)
      );
    }).catch(() => {});

    return () => { active = false; };
  }, [productId, category, relatedIds]);

  const inCart = quantityInCart(items, product.id);
  const available = Math.max(0, product.stock - inCart);
  const hasCustomization = (product.customizationFields ?? []).length > 0;

  // Supplément total de personnalisation
  const customizationExtra = product.customizationFields
    ? calcExtra(product.customizationFields, customization)
    : 0;
  const unitPrice = product.price + customizationExtra;

  function handleCustomizationChange(fieldId: string, value: string) {
    setCustomization((prev) => ({ ...prev, [fieldId]: value }));
    setErrorFields((prev) => { const next = new Set(prev); next.delete(fieldId); return next; });
  }

  function handleAddToCart() {
    if (available <= 0) {
      showToast({ message: "Quantité maximale déjà au panier" });
      return;
    }

    const requiredFields = product.customizationFields?.filter((f) => f.required) ?? [];
    const missing = requiredFields.filter((f) => !customization[f.id]?.trim());
    if (missing.length > 0) {
      setErrorFields(new Set(missing.map((f) => f.id)));
      showToast({ message: `Veuillez renseigner : ${missing.map((f) => f.label).join(", ")}` });
      return;
    }
    setErrorFields(new Set());

    const customizationLabels: Record<string, string> = {};
    if (product.customizationFields) {
      for (const field of product.customizationFields) {
        if (customization[field.id]) {
          customizationLabels[field.label] = customization[field.id];
        }
      }
    }

    const cartItemId = buildCartItemId(product.id, Object.keys(customization).length > 0 ? customization : undefined);

    const itemToAdd: Parameters<typeof addItem>[0] = {
      cartItemId,
      productId: product.id,
      name: product.name,
      price: unitPrice,
      basePrice: product.price,
      imageUrl: product.imageUrl,
      quantity: Math.min(qty, available),
      maxQuantity: product.stock,
    };
    if (Object.keys(customization).length > 0) itemToAdd.customization = customization;
    if (Object.keys(customizationLabels).length > 0) itemToAdd.customizationLabels = customizationLabels;
    if (customizationExtra > 0) itemToAdd.customizationExtra = customizationExtra;
    addItem(itemToAdd);
    showToast({ message: product.name, imageUrl: product.imageUrl, price: formatPrice(unitPrice) });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const gallery = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const productUrl = `${SITE_URL}/produits/${product.slug}`;

  const tabs: { key: Tab; label: string; content: string | undefined }[] = [
    { key: "description", label: "Description", content: product.description },
    { key: "materials", label: "Matériaux", content: product.materials },
    { key: "care", label: "Entretien", content: product.careInstructions },
  ];
  const availableTabs = tabs.filter((t) => t.content);
  const activeTab = availableTabs.find((t) => t.key === tab) ?? availableTabs[0];

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link href="/catalogue" className="inline-flex items-center gap-2 text-sm text-brown-light hover:text-terracotta mb-10 transition-colors">
          <ArrowLeft size={14} /> Retour au catalogue
        </Link>

        <div className="grid md:grid-cols-2 gap-14">
          <ImageCarousel images={gallery} alt={product.name} featured={product.featured} />

          <div className="flex flex-col py-2">
            <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-3">
              {categories.find((c) => c.key === product.category)?.label ?? product.category}
            </p>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="font-serif text-3xl font-semibold text-brown leading-tight">{product.name}</h1>
              <WishlistButton productId={product.id} size={18} className="flex-shrink-0 mt-1" />
            </div>

            {rating && (
              <a href="#avis" className="flex items-center gap-2 mb-4 -mt-1 text-sm text-brown-light hover:text-terracotta transition-colors w-fit">
                <span className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={14} className={star <= Math.round(rating.average) ? "text-terracotta fill-terracotta" : "text-border"} />
                  ))}
                </span>
                <span>
                  <span className="font-medium text-brown-mid">{rating.average.toFixed(1).replace(".", ",")}</span> · {rating.count} avis
                </span>
              </a>
            )}

            {/* Prix — avec détail personnalisation si applicable */}
            <div className="mb-6">
              {customizationExtra > 0 ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-semibold text-terracotta">{formatPrice(unitPrice)}</span>
                  <span className="text-sm text-brown-light">
                    ({formatPrice(product.price)}
                    <span className="text-terracotta font-medium"> +{formatPrice(customizationExtra)} perso.</span>)
                  </span>
                </div>
              ) : (
                <p className="text-3xl font-semibold text-terracotta">{formatPrice(product.price)}</p>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock > 0 ? (
                <><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /><span className="text-sm text-brown-mid">En stock ({product.stock} disponibles)</span></>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /><span className="text-sm text-brown-light">Rupture de stock</span></>
              )}
            </div>

            {/* Personnalisation */}
            {product.customizationFields && product.customizationFields.length > 0 && (
              <div className="mb-6 p-4 bg-sand border border-border rounded-2xl space-y-4">
                <p className="text-xs font-semibold text-brown uppercase tracking-widest">Personnalisation</p>
                {product.customizationFields.map((field) => (
                  <CustomizationInput
                    key={field.id}
                    field={field}
                    value={customization[field.id] ?? ""}
                    onChange={(v) => handleCustomizationChange(field.id, v)}
                    hasError={errorFields.has(field.id)}
                  />
                ))}
              </div>
            )}

            {/* Quantité */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-brown-light">Quantité :</span>
              <div className="flex items-center border border-border rounded-xl bg-sand">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2.5 text-brown-mid hover:text-brown transition-colors">−</button>
                <span className="px-4 text-sm font-medium text-brown">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(available, q + 1))} disabled={qty >= available} className="px-4 py-2.5 text-brown-mid hover:text-brown transition-colors disabled:opacity-30">+</button>
              </div>
              {qty > 1 && (
                <span className="text-sm text-brown-light">= <span className="font-medium text-brown">{formatPrice(unitPrice * qty)}</span></span>
              )}
            </div>

            {product.stock === 0 ? (
              <div className="mb-6">
                <button
                  disabled
                  className="flex items-center justify-center gap-2.5 w-full py-4 px-8 rounded-2xl font-medium text-sm bg-brown text-cream opacity-40 cursor-not-allowed"
                >
                  <ShoppingBag size={18} /> Produit indisponible
                </button>
                <p className="text-center text-sm text-brown-light mt-2">
                  Ce produit est actuellement en rupture de stock.
                </p>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className={`flex items-center justify-center gap-2.5 w-full py-4 px-8 rounded-2xl font-medium text-sm transition-all mb-6 ${
                  added ? "bg-green-700 text-cream" : "bg-brown text-cream hover:bg-brown-mid"
                }`}
              >
                {added
                  ? <><CheckCircle size={18} /> Ajouté au panier !</>
                  : <><ShoppingBag size={18} /> Ajouter au panier — {formatPrice(unitPrice * qty)}</>}
              </button>
            )}

            {/* Réassurance : les réponses aux doutes, juste sous le bouton d'achat */}
            <ul className="mb-6 p-4 bg-sand border border-border rounded-2xl space-y-2.5 text-sm text-brown-mid">
              <li className="flex items-start gap-2.5">
                <Clock size={15} className="text-terracotta flex-shrink-0 mt-0.5" />
                {/* Une création personnalisée dépend d'échanges avec la cliente : pas de délai promis */}
                <span>
                  {hasCustomization
                    ? "Façonné à la main en Bretagne, réalisé sur commande pour vous"
                    : `Façonné à la main en Bretagne, expédié sous ${PREPARATION_DELAY}`}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Truck size={15} className="text-terracotta flex-shrink-0 mt-0.5" />
                <span>
                  Livraison en point relais {formatPrice(DEFAULT_SHIPPING_PRICE)}, offerte dès {formatPrice(FREE_SHIPPING_THRESHOLD)} d&apos;achat
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Lock size={15} className="text-terracotta flex-shrink-0 mt-0.5" />
                <span>Paiement sécurisé par Stripe, sans création de compte</span>
              </li>
              <li className="flex items-start gap-2.5">
                <RotateCcw size={15} className="text-terracotta flex-shrink-0 mt-0.5" />
                <span>
                  {hasCustomization
                    ? <>Création personnalisée, réalisée sur commande (<Link href="/cgv" className="underline underline-offset-2 hover:text-terracotta">conditions de retour</Link>)</>
                    : <>Rétractation possible sous 14 jours (<Link href="/cgv" className="underline underline-offset-2 hover:text-terracotta">voir les CGV</Link>)</>}
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <MessageCircle size={15} className="text-terracotta flex-shrink-0 mt-0.5" />
                <span>
                  Une question ? <Link href="/contact" className="underline underline-offset-2 hover:text-terracotta">Écrivez à Anaïs</Link>, elle vous répond personnellement
                </span>
              </li>
            </ul>

            <div className="mb-6">
              <ShareButtons url={productUrl} title={product.name} />
            </div>

            {availableTabs.length > 0 && (
              <div className="border-t border-border pt-6">
                {availableTabs.length > 1 ? (
                  <div className="flex gap-1 mb-5 bg-sand rounded-xl p-1">
                    {availableTabs.map((t) => (
                      <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-3">{activeTab?.label}</p>
                )}
                <p className="text-sm text-brown-light leading-relaxed">{activeTab?.content}</p>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Choisis par Anaïs</p>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-8">Pour accompagner cette création</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}

        <div id="avis" className="scroll-mt-24">
          <ProductReviews productId={product.id} />
        </div>

        {similar.length > 0 && (
          <div className="mt-20">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Dans la même catégorie</p>
                <h2 className="font-serif text-2xl font-semibold text-brown">Vous aimerez aussi</h2>
              </div>
              <Link href={`/catalogue/${product.category}`} className="text-sm text-brown-light hover:text-terracotta transition-colors">Voir tout →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {similar.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
