"use client";

import { Suspense } from "react";
import { CatalogueContent } from "@/app/catalogue/page";
import { ProductGridSkeleton } from "@/app/ui/skeletons";

export default function CategoryClient({
  categoryKey,
  categoryLabel,
  categoryDescription,
}: {
  categoryKey: string;
  categoryLabel: string;
  categoryDescription?: string;
}) {
  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">
            Nos créations
          </p>
          <h1 className="font-serif text-4xl font-semibold text-brown">{categoryLabel}</h1>
          {categoryDescription && (
            <p className="mt-4 max-w-2xl text-brown-light leading-relaxed whitespace-pre-line">{categoryDescription}</p>
          )}
        </div>
      </div>
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-10"><ProductGridSkeleton count={8} /></div>}>
        <CatalogueContent fixedCategory={categoryKey} />
      </Suspense>
    </div>
  );
}
