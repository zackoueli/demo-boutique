"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
  featured?: boolean;
}

export default function ImageCarousel({ images, alt, featured }: Props) {
  const [current, setCurrent] = useState(0);
  const valid = images.filter(Boolean);

  if (valid.length === 0) {
    return (
      <div className="aspect-square bg-sand rounded-3xl flex items-center justify-center">
        <ShoppingBag size={60} className="text-parchment" />
      </div>
    );
  }

  function prev() { setCurrent((i) => (i - 1 + valid.length) % valid.length); }
  function next() { setCurrent((i) => (i + 1) % valid.length); }

  return (
    <div className="flex flex-col gap-3">
      {/* Image principale */}
      <div className="relative aspect-square bg-sand rounded-3xl overflow-hidden group">
        <Image
          key={valid[current]}
          src={valid[current]}
          alt={`${alt} ${current + 1}`}
          fill
          priority={current === 0}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-opacity duration-300"
        />

        {featured && (
          <span className="absolute top-4 left-4 bg-terracotta text-cream text-xs font-medium px-3 py-1.5 rounded-full z-10">
            Coup de cœur
          </span>
        )}

        {valid.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-cream/80 hover:bg-cream flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <ChevronLeft size={18} className="text-brown" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-cream/80 hover:bg-cream flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <ChevronRight size={18} className="text-brown" />
            </button>
            {/* Indicateurs */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {valid.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-cream w-4" : "bg-cream/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {valid.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {valid.map((src, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                i === current ? "border-brown" : "border-border hover:border-brown-light"
              }`}
            >
              <Image src={src} alt={`${alt} miniature ${i + 1}`} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
