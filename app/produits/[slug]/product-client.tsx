"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product, CustomizationField } from "@/lib/types";
import { useCart, buildCartItemId } from "@/lib/cart-context";
import { useToast } from "@/lib/toast-context";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, CheckCircle } from "lucide-react";
import { ProductDetailSkeleton, ProductGridSkeleton } from "@/app/ui/skeletons";
import ImageCarousel from "@/app/ui/image-carousel";
import ProductCard from "@/app/ui/product-card";
import ProductReviews from "@/app/ui/product-reviews";
import WishlistButton from "@/app/ui/wishlist-button";
import ShareButtons from "@/app/ui/share-buttons";

const CATEGORY_LABELS: Record<Product["category"], string> = {
  rings: "Bague", necklaces: "Collier", bracelets: "Bracelet", earrings: "Boucles d'oreilles",
};

type Tab = "description" | "materials" | "care";

/* ─── Rendu d'un champ de personnalisation ─── */
function CustomizationInput({
  field,
  value,
  onChange,
}: {
  field: CustomizationField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "text") {
    return (
      <div>
        <label className="block text-sm font-medium text-brown-mid mb-1.5">
          {field.label}{field.required && <span className="text-terracotta ml-0.5">*</span>}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Votre ${field.label.toLowerCase()}`}
          required={field.required}
          className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition"
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="block text-sm font-medium text-brown-mid mb-1.5">
          {field.label}{field.required && <span className="text-terracotta ml-0.5">*</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                value === opt
                  ? "border-brown bg-brown text-cream"
                  : "border-border bg-sand text-brown-mid hover:border-brown-mid"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "color") {
    const COLOR_MAP: Record<string, string> = {
      // Métaux / paillettes
      "Or": "#D4AF37", "Doré": "#FFD700", "Or rose": "#E8A090",
      "Argent": "#C0C0C0", "Argenté": "#A8A8A8",
      "Bronze": "#CD7F32", "Cuivre": "#B87333",
      // Basiques
      "Blanc": "#FFFFFF", "Crème": "#FFF8F0", "Ivoire": "#FFFFF0",
      "Noir": "#1A1A1A", "Gris": "#808080", "Gris clair": "#D3D3D3",
      // Chauds
      "Rouge": "#E53935", "Rouge bordeaux": "#800020", "Bordeaux": "#722F37",
      "Rose": "#F4A7B9", "Rose poudré": "#F8C8D4", "Rose fuchsia": "#FF69B4",
      "Orange": "#FF8C00", "Corail": "#FF6B6B", "Saumon": "#FA8072",
      "Jaune": "#FFD600", "Jaune doré": "#F5C518",
      "Terracotta": "#C76442",
      // Froids
      "Bleu": "#1976D2", "Bleu marine": "#002366", "Bleu ciel": "#87CEEB",
      "Bleu turquoise": "#40E0D0", "Turquoise": "#30D5C8",
      "Vert": "#2E7D32", "Vert sauge": "#8FBC8B", "Vert menthe": "#98FF98",
      "Violet": "#7B1FA2", "Mauve": "#C8A2C8", "Lilas": "#C8A2C8",
      "Lavande": "#E6E6FA",
      // Naturels
      "Marron": "#795548", "Caramel": "#C68642", "Beige": "#F5F5DC",
      "Nude": "#E8C9A0",
    };

    function resolveColor(opt: string): string {
      if (opt.startsWith("#") || opt.startsWith("rgb")) return opt;
      return COLOR_MAP[opt] ?? "#E0D5C8"; // fallback neutre visible
    }

    function isLight(opt: string): boolean {
      const hex = resolveColor(opt).replace("#", "");
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
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              title={opt}
              onClick={() => onChange(opt)}
              className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                value === opt ? "border-brown scale-110 shadow-md" : "border-border hover:border-brown-mid"
              }`}
              style={{ backgroundColor: resolveColor(opt) }}
            >
              {value === opt && (
                <CheckCircle size={14} className={isLight(opt) ? "text-brown" : "text-white"} />
              )}
            </button>
          ))}
        </div>
        {value && <p className="text-xs text-brown-mid mt-1.5">Sélectionné : <span className="font-medium">{value}</span></p>}
      </div>
    );
  }

  return null;
}

export default function ProductClient(props: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>("description");
  const [customization, setCustomization] = useState<Record<string, string>>({});
  const { addItem } = useCart();
  const { showToast } = useToast();

  useEffect(() => {
    props.params.then(({ slug }) => setSlug(slug));
  }, [props.params]);

  useEffect(() => {
    if (!slug) return;
    getDocs(query(collection(db, "products"), where("slug", "==", slug), limit(1))).then((snap) => {
      if (!snap.empty) {
        const p = { id: snap.docs[0].id, ...snap.docs[0].data() } as Product;
        setProduct(p);
        getDocs(
          query(collection(db, "products"), where("category", "==", p.category), limit(5))
        ).then((simSnap) => {
          setSimilar(
            simSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Product))
              .filter((s) => s.id !== p.id)
              .slice(0, 4)
          );
        });
      }
      setLoading(false);
    });
  }, [slug]);

  function handleCustomizationChange(fieldId: string, value: string) {
    setCustomization((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleAddToCart() {
    if (!product) return;

    // Vérifie les champs obligatoires
    const requiredFields = product.customizationFields?.filter((f) => f.required) ?? [];
    for (const field of requiredFields) {
      if (!customization[field.id]?.trim()) {
        showToast({ message: `Veuillez renseigner : ${field.label}` });
        return;
      }
    }

    // Construit les labels lisibles pour l'affichage
    const customizationLabels: Record<string, string> = {};
    if (product.customizationFields) {
      for (const field of product.customizationFields) {
        if (customization[field.id]) {
          customizationLabels[field.label] = customization[field.id];
        }
      }
    }

    const cartItemId = buildCartItemId(product.id, Object.keys(customization).length > 0 ? customization : undefined);

    addItem({
      cartItemId,
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: qty,
      customization: Object.keys(customization).length > 0 ? customization : undefined,
      customizationLabels: Object.keys(customizationLabels).length > 0 ? customizationLabels : undefined,
    });
    showToast({ message: product.name, imageUrl: product.imageUrl, price: formatPrice(product.price) });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return <div className="bg-cream min-h-screen"><ProductDetailSkeleton /></div>;

  if (!product) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <p className="font-serif text-xl text-brown-light mb-4">Produit introuvable.</p>
          <Link href="/catalogue" className="inline-flex items-center gap-2 text-terracotta hover:text-terra-light transition-colors text-sm">
            <ArrowLeft size={14} /> Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const gallery = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const productUrl = typeof window !== "undefined" ? window.location.href : `https://demo.breizhapp.tech/produits/${product.slug}`;

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
          {/* Galerie */}
          <ImageCarousel images={gallery} alt={product.name} featured={product.featured} />

          {/* Infos */}
          <div className="flex flex-col py-2">
            <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-3">
              {CATEGORY_LABELS[product.category]}
            </p>
            <div className="flex items-start justify-between gap-3 mb-4">
              <h1 className="font-serif text-3xl font-semibold text-brown leading-tight">{product.name}</h1>
              <WishlistButton productId={product.id} size={18} className="flex-shrink-0 mt-1" />
            </div>
            <p className="text-3xl font-semibold text-terracotta mb-6">{formatPrice(product.price)}</p>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              {product.stock > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm text-brown-mid">En stock ({product.stock} disponibles)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  <span className="text-sm text-brown-light">Rupture de stock</span>
                </>
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
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} disabled={qty >= product.stock} className="px-4 py-2.5 text-brown-mid hover:text-brown transition-colors disabled:opacity-30">+</button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={`flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl font-medium text-sm transition-all mb-6 ${
                added ? "bg-green-700 text-cream" : "bg-brown text-cream hover:bg-brown-mid"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {added ? <><CheckCircle size={18} /> Ajouté au panier !</> : <><ShoppingBag size={18} /> Ajouter au panier</>}
            </button>

            {/* Partage */}
            <div className="mb-6">
              <ShareButtons url={productUrl} title={product.name} />
            </div>

            {/* Onglets */}
            {availableTabs.length > 0 && (
              <div className="border-t border-border pt-6">
                {availableTabs.length > 1 ? (
                  <div className="flex gap-1 mb-5 bg-sand rounded-xl p-1">
                    {availableTabs.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          tab === t.key ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-3">
                    {activeTab?.label}
                  </p>
                )}
                <p className="text-sm text-brown-light leading-relaxed">
                  {activeTab?.content}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Avis clients */}
        <ProductReviews productId={product.id} />

        {/* Produits similaires */}
        {similar.length > 0 && (
          <div className="mt-20">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Dans la même catégorie</p>
                <h2 className="font-serif text-2xl font-semibold text-brown">Vous aimerez aussi</h2>
              </div>
              <Link href={`/catalogue?category=${product.category}`} className="text-sm text-brown-light hover:text-terracotta transition-colors">
                Voir tout →
              </Link>
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
