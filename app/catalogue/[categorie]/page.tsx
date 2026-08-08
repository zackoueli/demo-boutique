import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CategoryClient from "./category-client";

const PROJECT_ID = "fir-boutique-754bb";

type FirestoreStringValue = { stringValue: string };
type FirestoreFields = {
  key?: FirestoreStringValue;
  label?: FirestoreStringValue;
};

async function fetchCategory(categorie: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "categories" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "key" },
              op: "EQUAL",
              value: { stringValue: categorie },
            },
          },
          limit: 1,
        },
      }),
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const fields: FirestoreFields = data[0]?.document?.fields;
    if (!fields) return null;

    return {
      key: fields.key?.stringValue ?? categorie,
      label: fields.label?.stringValue ?? categorie,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  props: { params: Promise<{ categorie: string }> }
): Promise<Metadata> {
  const { categorie } = await props.params;
  const category = await fetchCategory(categorie);

  if (!category) {
    return { title: "Catégorie introuvable" };
  }

  const title = `${category.label} — Bijoux mémoriels artisanaux`;
  const description = `Découvrez notre collection de ${category.label.toLowerCase()} : bijoux mémoriels façonnés à la main dans notre atelier en Bretagne.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function CategoryPage(
  props: { params: Promise<{ categorie: string }> }
) {
  const { categorie } = await props.params;
  const category = await fetchCategory(categorie);

  if (!category) notFound();

  return <CategoryClient categoryKey={category.key} categoryLabel={category.label} />;
}
