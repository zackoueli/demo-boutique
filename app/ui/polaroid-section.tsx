"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { usePhotos } from "@/lib/use-photos";

const ROTATIONS = [-8, 5, -3, 7, -6, 4, -5, 8];
const MAX_TRAIL = 8;
const MIN_DISTANCE = 60;

interface TrailItem {
  x: number;
  y: number;
  photo: { url: string; caption: string };
  rotation: number;
  id: number;
}

export default function PolaroidSection() {
  const { photos, loading } = usePhotos();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const counterRef = useRef(0);
  const photoIndexRef = useRef(0);
  const rotationIndexRef = useRef(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!sectionRef.current || photos.length === 0) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (lastPos.current) {
        const dx = x - lastPos.current.x;
        const dy = y - lastPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE) return;
      }

      lastPos.current = { x, y };
      const photo = photos[photoIndexRef.current % photos.length];
      photoIndexRef.current++;

      const rotation = ROTATIONS[rotationIndexRef.current % ROTATIONS.length];
      rotationIndexRef.current++;

      const id = counterRef.current++;

      setTrail((prev) => {
        const next = [...prev, { x, y, photo, rotation, id }];
        return next.slice(-MAX_TRAIL);
      });
    },
    [photos]
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  function handleMouseLeave() {
    setTrail([]);
    lastPos.current = null;
  }

  if (loading || photos.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      onMouseLeave={handleMouseLeave}
      style={{ height: 900, cursor: "none" }}
      className="relative overflow-hidden bg-parchment border-t border-border select-none"
    >
      {/* Texte de fond */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-4">
        <p className="text-xs text-terracotta font-medium uppercase tracking-[0.2em]">Galerie</p>
        <h2 className="font-serif text-4xl md:text-5xl font-semibold text-brown/20 text-center px-8">
          Photos Souvenirs
        </h2>
        <p className="text-brown-light/40 text-sm">Déplacez votre curseur pour explorer</p>
      </div>

      {/* Polaroïds */}
      {trail.map((item, idx) => {
        const age = trail.length - 1 - idx; // 0 = le plus récent
        const opacity = Math.max(0.15, 1 - age * (0.85 / MAX_TRAIL));
        const scale = Math.max(0.6, 1 - age * (0.4 / MAX_TRAIL));

        return (
          <div
            key={item.id}
            className="absolute pointer-events-none"
            style={{
              left: item.x,
              top: item.y,
              transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${scale})`,
              opacity,
              transition: "opacity 0.3s ease, transform 0.3s ease",
              zIndex: idx,
            }}
          >
            {/* Style polaroïd */}
            <div
              style={{
                background: "#fff",
                padding: "16px 16px 64px 16px",
                boxShadow: "0 8px 32px rgba(61,43,31,0.18), 0 2px 8px rgba(61,43,31,0.1)",
                width: 312,
              }}
            >
              <div style={{ position: "relative", width: "100%", height: 280 }}>
                <Image
                  src={item.photo.url}
                  alt={item.photo.caption}
                  fill
                  sizes="312px"
                  className="object-cover"
                  draggable={false}
                />
              </div>
              {item.photo.caption && (
                <p
                  style={{
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: "#6b4c3b",
                    textAlign: "center",
                    marginTop: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {item.photo.caption}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
