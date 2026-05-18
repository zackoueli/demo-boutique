"use client";

import { useEffect, useRef } from "react";
import type { RelayPoint } from "@/lib/types";
import type { Map, Marker } from "leaflet";

interface RelayMapProps {
  points: (RelayPoint & { lat?: number; lng?: number })[];
  selected: RelayPoint | null;
  onSelect: (point: RelayPoint) => void;
}

export default function RelayMap({ points, selected, onSelect }: RelayMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const validPoints = points.filter((p) => p.lat && p.lng);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || validPoints.length === 0) return;

    async function init() {
      const L = (await import("leaflet")).default;

      (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl = undefined;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const center: [number, number] = [validPoints[0].lat!, validPoints[0].lng!];
      const map = L.map(containerRef.current!).setView(center, 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      markersRef.current = validPoints.map((point) => {
        const isSelected = selected?.id === point.id;

        const icon = L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${isSelected ? "#C0583A" : "#3D2B1F"};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:bold;display:block;text-align:center;line-height:28px;">R</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });

        const marker = L.marker([point.lat!, point.lng!], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px;">
              <strong style="font-size:13px;color:#3D2B1F;">${point.name}</strong><br/>
              <span style="font-size:11px;color:#8B6F5E;">${point.address}</span><br/>
              <span style="font-size:11px;color:#8B6F5E;">${point.postalCode} ${point.city}</span>
            </div>
          `);

        marker.on("click", () => onSelect(point));
        return marker;
      });

      if (validPoints.length > 1) {
        const bounds = L.latLngBounds(validPoints.map((p) => [p.lat!, p.lng!] as [number, number]));
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
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
