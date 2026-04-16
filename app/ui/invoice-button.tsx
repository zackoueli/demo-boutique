"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { Order } from "@/lib/types";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDate(createdAt: unknown): string {
  const ts = createdAt as { seconds: number } | null;
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  if (createdAt instanceof Date) return createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

interface InvoiceButtonProps {
  order: Order & { shippingCost?: number };
  variant?: "default" | "outline";
  className?: string;
}

export default function InvoiceButton({ order, variant = "default", className }: InvoiceButtonProps) {
  const [loading, setLoading] = useState(false);

  async function generatePDF() {
    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const W = 210;
      const margin = 20;
      const contentW = W - margin * 2;
      let y = margin;

      // ── Couleurs ──
      const brown: [number, number, number] = [61, 43, 31];
      const terracotta: [number, number, number] = [192, 88, 58];
      const light: [number, number, number] = [139, 111, 94];
      const sand: [number, number, number] = [240, 235, 228];
      const white: [number, number, number] = [250, 248, 245];

      // ── Header brun ──
      doc.setFillColor(...brown);
      doc.rect(0, 0, W, 42, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...white);
      doc.text("FACTURE", margin, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(200, 180, 154);
      doc.text(`Réf. commande : ${order.id}`, margin, 28);
      doc.text(`Date : ${formatDate(order.createdAt)}`, margin, 34);

      y = 55;

      // ── Bloc client ──
      doc.setFillColor(...sand);
      doc.roundedRect(margin, y, contentW, 32, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...light);
      doc.text("FACTURÉ À", margin + 8, y + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...brown);
      doc.text(order.shipping.fullName, margin + 8, y + 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...light);
      doc.text(order.userEmail, margin + 8, y + 22);

      // ── Bloc livraison ──
      const isRelay = order.shipping.type === "relay";
      const relayPoint = (order.shipping as { relayPoint?: { name: string } }).relayPoint;
      const carrier = (order.shipping as { carrier?: string }).carrier;

      const addrLines = isRelay
        ? [
            relayPoint?.name ?? "Point relais",
            ...(carrier ? [`Transporteur : ${carrier}`] : []),
            `${order.shipping.address}`,
            `${order.shipping.postalCode} ${order.shipping.city}`,
          ]
        : [
            order.shipping.address,
            `${order.shipping.postalCode} ${order.shipping.city}`,
            order.shipping.country,
          ];

      const addrBlockH = 14 + addrLines.length * 5;
      doc.setFillColor(...sand);
      doc.roundedRect(W / 2 + 2, y, contentW / 2 - 2, addrBlockH, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...light);
      doc.text(isRelay ? "LIVRAISON POINT RELAIS" : "ADRESSE DE LIVRAISON", W / 2 + 10, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...brown);
      addrLines.forEach((line, i) => {
        doc.text(line, W / 2 + 10, y + 15 + i * 5);
      });

      y += Math.max(32, addrBlockH) + 14;

      // ── Tableau articles ──
      // En-tête tableau
      doc.setFillColor(...brown);
      doc.rect(margin, y, contentW, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...white);
      doc.text("ARTICLE", margin + 4, y + 5.5);
      doc.text("QTÉ", margin + contentW * 0.65, y + 5.5, { align: "center" });
      doc.text("P.U.", margin + contentW * 0.78, y + 5.5, { align: "right" });
      doc.text("TOTAL", margin + contentW - 2, y + 5.5, { align: "right" });

      y += 8;

      // Lignes articles
      order.items.forEach((item, idx) => {
        const rowH = item.customizationLabels && Object.keys(item.customizationLabels).length > 0 ? 16 : 9;
        doc.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 248 : 243, idx % 2 === 0 ? 245 : 240);
        doc.rect(margin, y, contentW, rowH, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...brown);
        doc.text(doc.splitTextToSize(item.name, contentW * 0.6)[0], margin + 4, y + 6);

        if (item.customizationLabels && Object.keys(item.customizationLabels).length > 0) {
          const customText = Object.entries(item.customizationLabels)
            .map(([k, v]) => `${k}: ${v}`)
            .join("  ·  ");
          doc.setFontSize(7);
          doc.setTextColor(...light);
          doc.text(doc.splitTextToSize(customText, contentW * 0.6)[0], margin + 4, y + 11);
        }

        doc.setFontSize(9);
        doc.setTextColor(...brown);
        doc.text(String(item.quantity), margin + contentW * 0.65, y + 6, { align: "center" });
        doc.text(formatPrice(item.basePrice), margin + contentW * 0.78, y + 6, { align: "right" });

        doc.setFont("helvetica", "bold");
        doc.text(formatPrice(item.price * item.quantity), margin + contentW - 2, y + 6, { align: "right" });

        y += rowH;
      });

      // ── Totaux ──
      y += 6;
      const totalsX = margin + contentW * 0.55;
      const totalsW = contentW * 0.45;

      function totalRow(label: string, value: string, bold = false, color: [number, number, number] = brown) {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(9);
        doc.setTextColor(...light);
        doc.text(label, totalsX, y);
        doc.setTextColor(...color);
        doc.text(value, margin + contentW - 2, y, { align: "right" });
        y += 6;
      }

      totalRow("Sous-total", formatPrice(order.subtotal));
      if (order.discount && order.discount > 0) {
        totalRow(
          `Réduction${order.promoCode ? ` (${order.promoCode})` : ""}`,
          `−${formatPrice(order.discount)}`,
          false,
          terracotta
        );
      }
      const shippingCost = (order as { shippingCost?: number }).shippingCost ?? 0;
      totalRow("Frais de livraison", shippingCost === 0 ? "Gratuit" : formatPrice(shippingCost));

      // Ligne séparatrice
      doc.setDrawColor(...sand);
      doc.setLineWidth(0.5);
      doc.line(totalsX, y - 1, margin + contentW, y - 1);
      y += 2;

      // Total final
      doc.setFillColor(...sand);
      doc.roundedRect(totalsX - 4, y - 4, totalsW + 4, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...brown);
      doc.text("TOTAL TTC", totalsX, y + 4);
      doc.setTextColor(...terracotta);
      doc.text(formatPrice(order.total), margin + contentW - 2, y + 4, { align: "right" });

      y += 20;

      // ── Paiement ──
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...light);
      doc.text(
        `Paiement par carte bancaire — se terminant par ${order.payment.last4}`,
        margin,
        y
      );

      // ── Footer ──
      const footerY = 285;
      doc.setFillColor(...brown);
      doc.rect(0, footerY - 4, W, 16, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(200, 180, 154);
      doc.text("Merci pour votre confiance.", W / 2, footerY + 3, { align: "center" });
      doc.setTextColor(139, 111, 94);
      doc.text(`© ${new Date().getFullYear()} — Histoire Éternelle L'Atelier`, W / 2, footerY + 8, { align: "center" });

      doc.save(`facture-${order.id}.pdf`);
    } finally {
      setLoading(false);
    }
  }

  const baseStyle =
    variant === "outline"
      ? "flex items-center gap-2 px-4 py-2 border border-border text-brown-mid rounded-xl text-sm font-medium hover:bg-sand transition-colors disabled:opacity-50"
      : "flex items-center gap-2 px-4 py-2 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-50";

  return (
    <button onClick={generatePDF} disabled={loading} className={`${baseStyle} ${className ?? ""}`}>
      <FileText size={14} />
      {loading ? "Génération…" : "Télécharger la facture"}
    </button>
  );
}
