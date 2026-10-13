import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import ProductClient from "./product-client";
import { queryCollection } from "@/lib/firestore-rest";
import { DEFAULT_SHIPPING_PRICE, FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

// Une seule lecture par requête, partagée entre generateMetadata et la page
const getProduct = cache(async (slug: string): Promise<Product | null> => {
  const [doc] = await queryCollection("products", { where: ["slug", slug], limit: 1, revalidate: 60 });
  if (!doc) return null;
  return { id: doc.id, ...doc.data } as unknown as Product;
});

async function getRating(productId: string) {
  // Les avis sont un plus : s'ils sont illisibles, la fiche s'affiche sans note
  const reviews = await queryCollection("reviews", { where: ["productId", productId], revalidate: 300 }).catch(() => []);
  const ratings = reviews.map((r) => r.data.rating).filter((r): r is number => typeof r === "number");
  if (ratings.length === 0) return null;
  return { average: ratings.reduce((sum, r) => sum + r, 0) / ratings.length, count: ratings.length };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Produit introuvable" };
  }

  // Le nom du site est ajouté par le gabarit de titre du layout
  const title = product.name;
  const description = product.description
    ? product.description.length > 155 ? `${product.description.slice(0, 155)}…` : product.description
    : `${product.name}, création artisanale façonnée à la main en Bretagne par ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `/produits/${product.slug}` },
    openGraph: {
      title,
      description,
      images: product.imageUrl ? [{ url: product.imageUrl, alt: product.name }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  };
}

export default async function ProductPage(props: Props) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const rating = await getRating(product.id);
  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  // Même règle que la fiche : une création personnalisée est faite sur commande (pas de délai promis, pas de rétractation)
  const isCustom = (product.customizationFields?.length ?? 0) > 0;

  // Frais de port : tarif point relais par défaut, offert au-delà du seuil (cf. lib/shipping.ts)
  const shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: (product.price >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_PRICE / 100).toFixed(2),
      currency: "EUR",
    },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "FR" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      ...(isCustom ? {} : { handlingTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 5, unitCode: "DAY" } }),
      transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 4, unitCode: "DAY" },
    },
  };

  // Politique de retour : celle des CGV (articles 7 et 8)
  const returnPolicy = isCustom
    ? {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "FR",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      }
    : {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "FR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      };

  // Données structurées : prix, disponibilité et note affichables dans les résultats Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: images,
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/produits/${product.slug}`,
      priceCurrency: "EUR",
      price: (product.price / 100).toFixed(2),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails,
      hasMerchantReturnPolicy: returnPolicy,
    },
    ...(rating
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average.toFixed(1), reviewCount: rating.count } }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductClient product={product} />
    </>
  );
}
