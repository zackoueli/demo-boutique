import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, checkRateLimit, getClientIp } from "@/lib/api-helpers";

const FROM = process.env.RESEND_FROM ?? "commandes@demo-boutique.fr";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customizationLabels?: Record<string, string>;
}

interface ShippingData {
  type: "home" | "relay";
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  carrier?: string;
  relayPoint?: { name: string; hours?: string };
}

interface ConfirmationPayload {
  orderId: string;
  userEmail: string;
  items: OrderItem[];
  shipping: ShippingData;
  subtotal: number;
  shippingCost: number;
  discount?: number;
  promoCode?: string | null;
  total: number;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function buildHtml(d: ConfirmationPayload): string {
  const itemsRows = d.items
    .map((item) => {
      const customLines = item.customizationLabels
        ? Object.entries(item.customizationLabels)
            .map(([k, v]) => `<span style="font-size:11px;color:#8b6f5e;display:inline-block;background:#f5f0eb;border-radius:4px;padding:2px 6px;margin:2px 2px 0 0;">${k} : ${v}</span>`)
            .join("")
        : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e8e0d8;color:#3d2b1f;font-size:14px;">
            ${item.name} × ${item.quantity}
            ${customLines ? `<div style="margin-top:4px;">${customLines}</div>` : ""}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e8e0d8;text-align:right;font-weight:600;color:#3d2b1f;font-size:14px;white-space:nowrap;">
            ${formatPrice(item.price * item.quantity)}
          </td>
        </tr>`;
    })
    .join("");

  const shippingLine =
    d.shippingCost === 0
      ? `<span style="color:#6b8f6b;">Gratuit</span>`
      : formatPrice(d.shippingCost);

  const discountRow =
    d.discount && d.discount > 0
      ? `<tr>
          <td style="padding:4px 0;color:#8b6f5e;font-size:13px;">Réduction${d.promoCode ? ` (${d.promoCode})` : ""}</td>
          <td style="padding:4px 0;text-align:right;color:#c0583a;font-size:13px;">−${formatPrice(d.discount)}</td>
        </tr>`
      : "";

  const deliveryBlock =
    d.shipping.type === "relay"
      ? `<p style="margin:0 0 4px;color:#3d2b1f;font-weight:600;">${d.shipping.relayPoint?.name ?? "Point relais"}</p>
         <p style="margin:0;color:#8b6f5e;font-size:13px;">${d.shipping.address}, ${d.shipping.postalCode} ${d.shipping.city}</p>
         ${d.shipping.carrier ? `<p style="margin:4px 0 0;font-size:12px;color:#8b6f5e;">Transporteur : ${d.shipping.carrier}</p>` : ""}
         ${d.shipping.relayPoint?.hours ? `<p style="margin:4px 0 0;font-size:12px;color:#8b6f5e;font-style:italic;">${d.shipping.relayPoint.hours}</p>` : ""}`
      : `<p style="margin:0;color:#3d2b1f;font-weight:600;">${d.shipping.fullName}</p>
         <p style="margin:4px 0 0;color:#8b6f5e;font-size:13px;">${d.shipping.address}<br>${d.shipping.postalCode} ${d.shipping.city}<br>${d.shipping.country}</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#faf8f5;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(61,43,31,0.08);">

        <!-- Header -->
        <tr><td style="background:#3d2b1f;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#faf8f5;font-size:22px;font-weight:600;letter-spacing:0.05em;">Commande confirmée</h1>
          <p style="margin:8px 0 0;color:#c8b49a;font-size:13px;">Référence : <strong>${d.orderId}</strong></p>
        </td></tr>

        <!-- Intro -->
        <tr><td style="padding:32px 40px 24px;">
          <p style="margin:0;color:#3d2b1f;font-size:15px;line-height:1.6;">
            Bonjour <strong>${d.shipping.fullName}</strong>,<br><br>
            Merci pour votre commande ! Nous l'avons bien reçue et elle est en cours de traitement.
          </p>
        </td></tr>

        <!-- Articles -->
        <tr><td style="padding:0 40px 24px;">
          <h2 style="margin:0 0 16px;color:#3d2b1f;font-size:16px;font-weight:600;font-family:Georgia,serif;">Articles commandés</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${itemsRows}
            <tr><td style="padding:8px 0 4px;color:#8b6f5e;font-size:13px;">Sous-total</td>
                <td style="padding:8px 0 4px;text-align:right;color:#8b6f5e;font-size:13px;">${formatPrice(d.subtotal)}</td></tr>
            ${discountRow}
            <tr><td style="padding:4px 0;color:#8b6f5e;font-size:13px;">Livraison</td>
                <td style="padding:4px 0;text-align:right;font-size:13px;">${shippingLine}</td></tr>
            <tr><td style="padding:12px 0 0;color:#3d2b1f;font-size:16px;font-weight:700;border-top:2px solid #e8e0d8;">Total payé</td>
                <td style="padding:12px 0 0;text-align:right;color:#c0583a;font-size:16px;font-weight:700;border-top:2px solid #e8e0d8;">${formatPrice(d.total)}</td></tr>
          </table>
        </td></tr>

        <!-- Livraison -->
        <tr><td style="padding:0 40px 32px;">
          <div style="background:#f0ebe4;border-radius:12px;padding:20px 24px;">
            <h2 style="margin:0 0 12px;color:#3d2b1f;font-size:15px;font-weight:600;font-family:Georgia,serif;">
              ${d.shipping.type === "relay" ? "📦 Livraison en point relais" : "🏠 Livraison à domicile"}
            </h2>
            ${deliveryBlock}
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#3d2b1f;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#c8b49a;font-size:12px;line-height:1.6;">
            Vous avez une question ? Répondez à cet email ou contactez-nous via votre espace client.<br>
            <span style="color:#8b7060;">© ${new Date().getFullYear()} — Histoire Eternelle - L&apos;Atelier d&apos;Anaïs</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Trop de requêtes" }, { status: 429 });
    }

    const body: ConfirmationPayload = await req.json();

    if (!isValidEmail(body.userEmail)) {
      return NextResponse.json({ ok: false, error: "Email invalide" }, { status: 400 });
    }

    if (!body.orderId || typeof body.orderId !== "string" || body.orderId.length > 100) {
      return NextResponse.json({ ok: false, error: "orderId invalide" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("[send-confirmation] RESEND_API_KEY manquante — email non envoyé.");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: FROM,
      to: body.userEmail,
      subject: `Confirmation de commande · ${body.orderId}`,
      html: buildHtml(body),
    });

    if (error) {
      console.error("[send-confirmation] Resend error:", error);
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-confirmation] Unexpected error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
