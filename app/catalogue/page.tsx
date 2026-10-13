import CatalogueContent from "./catalogue-content";
import { getAllProducts } from "@/lib/products-server";

type Props = { searchParams: Promise<{ category?: string; sub?: string }> };

export default async function CataloguePage(props: Props) {
  const { category, sub } = await props.searchParams;
  const products = await getAllProducts();

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-2">
            Nos créations
          </p>
          <h1 className="font-serif text-4xl font-semibold text-brown">Catalogue</h1>
        </div>
      </div>
      <CatalogueContent activeCategory={category} activeSubCategory={sub} initialProducts={products} />
    </div>
  );
}
