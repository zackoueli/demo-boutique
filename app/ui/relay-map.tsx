"use client";

import { useEffect, useRef } from "react";
import type { RelayPoint } from "@/lib/types";
import "leaflet/dist/leaflet.css";

interface RelayMapProps {
  points: (RelayPoint & { lat?: number; lng?: number })[];
  selected: RelayPoint | null;
  onSelect: (point: RelayPoint) => void;
}

export default function RelayMap({ points, selected, onSelect }: RelayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);

  const validPoints = points.filter((p) => p.lat && p.lng);

  useEffect(() => {
    if (!containerRef.current || validPoints.length === 0) return;

    let map: unknown;

    async function init() {
      const L = (await import("leaflet")).default;

      // Fix icônes Leaflet avec webpack
      delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
      }

      const center: [number, number] = [validPoints[0].lat!, validPoints[0].lng!];
      map = L.map(containerRef.current!).setView(center, 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map as Parameters<typeof L.tileLayer>[1]);

      markersRef.current = validPoints.map((point) => {
        const isSelected = selected?.id === point.id;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            background:${isSelected ? "#C0583A" : "#3D2B1F"};
            border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          "><span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:bold;display:block;text-align:center;line-height:28px;">R</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([point.lat!, point.lng!], { icon })
          .addTo(map as Parameters<typeof L.marker>[1])
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px;">
              <strong style="font-size:13px;color:#3D2B1F;">${point.name}</strong><br/>
              <span style="font-size:11px;color:#8B6F5E;">${point.address}</span><br/>
              <span style="font-size:11px;color:#8B6F5E;">${point.postalCode} ${point.city}</span><br/>
              <button onclick="window.__selectRelay('${point.id}')" style="
                margin-top:8px;width:100%;padding:6px;background:#3D2B1F;color:white;
                border:none;border-radius:6px;font-size:12px;cursor:pointer;
              ">Choisir ce point</button>
            </div>
          `);

        marker.on("click", () => onSelect(point));
        return marker;
      });

      // Ajuste la vue pour inclure tous les marqueurs
      if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.lat!, p.lng!]));
        (map as { fitBounds: (b: unknown, o: unknown) => void }).fitBounds(bounds, { padding: [30, 30] });
      }
    }

    // Expose la fonction de sélection au popup HTML
    (window as Record<string, unknown>).__selectRelay = (id: string) => {
      const point = validPoints.find((p) => p.id === id);
      if (point) onSelect(point);
    };

    init();

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  }, [validPoints.map((p) => p.id).join(",")]);

  if (validPoints.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{ height: "320px", width: "100%", borderRadius: "12px", overflow: "hidden", zIndex: 0 }}
    />
  );
}
