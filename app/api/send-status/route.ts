import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, checkRateLimit, getClientIp } from "@/lib/api-helpers";

const FROM = process.env.RESEND_FROM ?? "commandes@demo-boutique.fr";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_MESSAGES: Record<string, string> = {
  processing: "Votre commande est en cours de préparation dans notre atelier. Nous vous informerons dès qu'elle sera expédiée.",
  shipped: "Votre commande vient d'être expédiée ! Elle est maintenant en route vers vous.",
  delivered: "Votre commande a été livrée. Nous espérons que vous êtes ravie de votre bijou !",
  cancelled: "Votre commande a été annulée. Si vous avez des questions, n'hésitez pas à nous contacter.",
};

const STATUS_EMOJI: Record<string, string> = {
  processing: "🔧",
  shipped: "📦",
  delivered: "✨",
  cancelled: "❌",
};

interface StatusPayload {
  orderId: string;
  userEmail: string;
  fullName: string;
  status: string;
  total: number;
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function buildHtml(d: StatusPayload): string {
  const label = STATUS_LABELS[d.status] ?? d.status;
  const message = STATUS_MESSAGES[d.status] ?? "Le statut de votre commande a été mis à jour.";
  const emoji = STATUS_EMOJI[d.status] ?? "ℹ️";
  const isCancelled = d.status === "cancelled";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#faf8f5;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(61,43,31,0.08);">

        <tr><td style="background:#3d2b1f;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#faf8f5;font-size:20px;font-weight:600;">Mise à jour de votre commande</h1>
          <p style="margin:8px 0 0;color:#c8b49a;font-size:13px;">Référence : <strong>${d.orderId}</strong></p>
        </td></tr>

        <tr><td style="padding:40px 40px 32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">${emoji}</div>
          <div style="display:inline-block;background:${isCancelled ? "#fee2e2" : "#f0ebe4"};border-radius:20px;padding:8px 20px;margin-bottom:20px;">
            <span style="font-size:14px;font-weight:600;color:${isCancelled ? "#dc2626" : "#c0583a"};">${label}</span>
          </div>
          <p style="margin:0;color:#3d2b1f;font-size:15px;line-height:1.7;max-width:420px;margin:0 auto;">
            Bonjour <strong>${d.fullName}</strong>,<br><br>
            ${message}
          </p>
        </td></tr>

        <tr><td style="padding:0 40px 32px;">
          <div style="background:#f0ebe4;border-radius:12px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#8b6f5e;font-size:13px;">Montant total</span>
            <span style="color:#c0583a;font-weight:700;font-size:15px;">${formatPrice(d.total)}</span>
          </div>
        </td></tr>

        ${d.status !== "cancelled" ? `
        <tr><td style="padding:0 40px 32px;text-align:center;">
          <a href="https://histoire-eternelle-l-atelier.fr/compte" style="display:inline-block;background:#3d2b1f;color:#faf8f5;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:500;">
            Suivre ma commande
          </a>
        </td></tr>` : ""}

        <tr><td style="background:#3d2b1f;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#c8b49a;font-size:12px;line-height:1.6;">
            Une question ? Répondez à cet email ou contactez-nous.<br>
            <span style="color:#8b7060;">© ${new Date().getFullYear()} — Histoire Eternelle - L'Atelier d'Anaïs</span>
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

    const body: StatusPayload = await req.json();

    if (!isValidEmail(body.userEmail)) {
      return NextResponse.json({ ok: false, error: "Email invalide" }, { status: 400 });
    }

    if (!body.orderId || typeof body.orderId !== "string" || body.orderId.length > 100) {
      return NextResponse.json({ ok: false, error: "orderId invalide" }, { status: 400 });
    }

    const VALID_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 });
    }

    // On n'envoie pas d'email pour "pending" (état initial)
    if (body.status === "pending") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn("[send-status] RESEND_API_KEY manquante — email non envoyé.");
      return NextResponse.json({ ok: true, skipped: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const label = STATUS_LABELS[body.status] ?? body.status;
    const { error } = await resend.emails.send({
      from: FROM,
      to: body.userEmail,
      subject: `Commande ${body.orderId} — ${label}`,
      html: buildHtml(body),
    });

    if (error) {
      console.error("[send-status] Resend error:", error);
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-status] Unexpected error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
