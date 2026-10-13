import CatalogueContent from "@/app/catalogue/catalogue-content";
import type { Product } from "@/lib/types";

export default function CategoryClient({
  categoryKey,
  categoryLabel,
  categoryDescription,
  subCategory,
  initialProducts,
}: {
  categoryKey: string;
  categoryLabel: string;
  categoryDescription?: string;
  subCategory?: string;
  initialProducts: Product[] | null;
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
      <CatalogueContent activeCategory={categoryKey} activeSubCategory={subCategory} initialProducts={initialProducts} />
    </div>
  );
}
