import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import CategoryClient from "./category-client";
import { queryCollection } from "@/lib/firestore-rest";

type Props = { params: Promise<{ categorie: string }> };

const fetchCategory = cache(async (categorie: string) => {
  const [doc] = await queryCollection("categories", { where: ["key", categorie], limit: 1, revalidate: 300 });
  if (!doc) return null;
  return {
    key: (doc.data.key as string) ?? categorie,
    label: (doc.data.label as string) ?? categorie,
    // Texte d'introduction rédigé dans l'admin (Catégories)
    description: ((doc.data.description as string) ?? "").trim(),
  };
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { categorie } = await props.params;
  const category = await fetchCategory(categorie);

  if (!category) {
    return { title: "Catégorie introuvable" };
  }

  const title = `${category.label} — Créations artisanales en résine · L'Atelier d'Anaïs`;
  const description = category.description
    ? category.description.length > 155 ? `${category.description.slice(0, 155)}…` : category.description
    : `Découvrez notre collection de ${category.label.toLowerCase()} : bijoux mémoriels façonnés à la main dans notre atelier en Bretagne.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/catalogue/${category.key}` },
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function CategoryPage(props: Props) {
  const { categorie } = await props.params;
  const category = await fetchCategory(categorie);

  if (!category) notFound();

  return (
    <CategoryClient
      categoryKey={category.key}
      categoryLabel={category.label}
      categoryDescription={category.description}
    />
  );
}
