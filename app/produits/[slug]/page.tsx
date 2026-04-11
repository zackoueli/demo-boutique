import type { Metadata } from "next";
import ProductClient from "./product-client";
import { formatPrice } from "@/lib/utils";

const PROJECT_ID = "fir-boutique-754bb";

type FirestoreStringValue = { stringValue: string };
type FirestoreIntValue = { integerValue: string };
type FirestoreFields = {
  name?: FirestoreStringValue;
  description?: FirestoreStringValue;
  imageUrl?: FirestoreStringValue;
  price?: FirestoreIntValue;
  category?: FirestoreStringValue;
};

async function fetchProductMeta(slug: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "products" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "slug" },
              op: "EQUAL",
              value: { stringValue: slug },
            },
          },
          limit: 1,
        },
      }),
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const fields: FirestoreFields = data[0]?.document?.fields;
    if (!fields) return null;

    return {
      name: fields.name?.stringValue ?? "",
      description: fields.description?.stringValue ?? "",
      imageUrl: fields.imageUrl?.stringValue ?? "",
      price: parseInt(fields.price?.integerValue ?? "0"),
      category: fields.category?.stringValue ?? "",
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await fetchProductMeta(slug);

  if (!product) {
    return {
      title: "Produit introuvable — Bijoux & Co",
    };
  }

  const title = `${product.name} — Bijoux & Co`;
  const description = product.description
    ? `${product.description.slice(0, 155)}…`
    : `Découvrez ${product.name}, ${product.category} artisanal chez Bijoux & Co. ${formatPrice(product.price)}.`;

  return {
    title,
    description,
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

export default function ProductPage(props: { params: Promise<{ slug: string }> }) {
  return <ProductClient params={props.params} />;
}
