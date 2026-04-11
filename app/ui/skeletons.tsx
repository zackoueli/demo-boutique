export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-cream animate-pulse">
      <div className="aspect-square bg-sand" />
      <div className="p-4 space-y-2.5">
        <div className="h-2.5 bg-sand rounded-full w-1/3" />
        <div className="h-4 bg-sand rounded-full w-3/4" />
        <div className="flex items-center justify-between mt-3">
          <div className="h-4 bg-sand rounded-full w-1/4" />
          <div className="w-7 h-7 bg-sand rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
      {[...Array(count)].map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-14 animate-pulse">
      <div className="aspect-square bg-sand rounded-3xl" />
      <div className="space-y-4 pt-2">
        <div className="h-3 bg-sand rounded-full w-1/4" />
        <div className="h-8 bg-sand rounded-full w-3/4" />
        <div className="h-7 bg-sand rounded-full w-1/3" />
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-sand rounded-full w-full" />
          <div className="h-3 bg-sand rounded-full w-5/6" />
          <div className="h-3 bg-sand rounded-full w-4/6" />
        </div>
        <div className="h-12 bg-sand rounded-2xl w-full mt-4" />
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="border border-border rounded-2xl p-5 bg-cream animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <div className="h-2.5 bg-sand rounded-full w-32" />
          <div className="h-3 bg-sand rounded-full w-20" />
        </div>
        <div className="space-y-1.5 items-end flex flex-col">
          <div className="h-5 bg-sand rounded-full w-20" />
          <div className="h-4 bg-sand rounded-full w-16" />
        </div>
      </div>
      <div className="h-3 bg-sand rounded-full w-2/3" />
    </div>
  );
}
