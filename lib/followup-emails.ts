import { Resend } from "resend";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/shipping";

/* Emails envoyés après coup par la tâche planifiée (/api/cron/emails) :
   relance de panier (3 messages) et demande d'avis après livraison. */

const FROM = process.env.RESEND_FROM ?? "commandes@demo-boutique.fr";

export interface EmailItem {
  name: string;
  imageUrl?: string;
  quantity: number;
  price: number; // centimes, prix unitaire
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#3d2b1f;color:#faf8f5;text-decoration:none;padding:13px 30px;border-radius:50px;font-size:14px;font-weight:500;">${label}</a>`;
}

function layout(opts: { heading: string; body: string; footer: string }): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#faf8f5;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(61,43,31,0.08);">
        <tr><td style="background:#3d2b1f;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#faf8f5;font-size:21px;font-weight:600;font-family:Georgia,serif;">${opts.heading}</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;color:#3d2b1f;font-size:15px;line-height:1.7;">
          ${opts.body}
        </td></tr>
        <tr><td style="background:#3d2b1f;padding:24px 40px;text-align:center;">
          <p style="margin:0;color:#c8b49a;font-size:12px;line-height:1.7;">
            ${opts.footer}<br>
            <span style="color:#8b7060;">© ${new Date().getFullYear()} — ${escapeHtml(SITE_NAME)}</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itemsTable(items: EmailItem[]): string {
  const rows = items
    .map((item) => `
      <tr>
        <td width="64" style="padding:10px 0;border-bottom:1px solid #e8e0d8;">
          ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" width="52" height="52" style="display:block;border-radius:10px;object-fit:cover;">` : ""}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8e0d8;font-size:14px;color:#3d2b1f;">
          ${escapeHtml(item.name)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8e0d8;text-align:right;font-size:14px;font-weight:600;color:#c0583a;white-space:nowrap;">
          ${formatPrice(item.price * item.quantity)}
        </td>
      </tr>`)
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 28px;">${rows}</table>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[followup-emails] RESEND_API_KEY manquante — email non envoyé.");
    return false;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[followup-emails] Resend error:", error);
    return false;
  }
  return true;
}

/* ─── Relance de panier : étape 1 (rappel), 2 (réassurance), 3 (dernier message) ─── */

export interface CartReminder {
  email: string;
  cartId: string;
  token: string;
  items: EmailItem[];
}

export async function sendCartReminder(stage: 1 | 2 | 3, cart: CartReminder): Promise<boolean> {
  const cartUrl = `${SITE_URL}/panier?restore=${cart.cartId}&t=${cart.token}`;
  const unsubscribeUrl = `${SITE_URL}/api/cart/unsubscribe?id=${cart.cartId}&t=${cart.token}`;
  const footer = `Vous recevez ce message car vous avez demandé un rappel de votre panier.<br>
    <a href="${unsubscribeUrl}" style="color:#c8b49a;">Ne plus recevoir ces rappels</a>`;
  const cta = `<p style="text-align:center;margin:0;">${button("Retrouver mon panier", cartUrl)}</p>`;
  const threshold = formatPrice(FREE_SHIPPING_THRESHOLD);

  if (stage === 1) {
    return send(cart.email, "Votre panier vous attend", layout({
      heading: "Votre panier vous attend",
      body: `<p style="margin:0;">Bonjour,</p>
        <p style="margin:12px 0 0;">Vous avez laissé ces créations dans votre panier. Elles y sont toujours, prêtes à être commandées quand vous le souhaitez.</p>
        ${itemsTable(cart.items)}
        ${cta}`,
      footer,
    }));
  }

  if (stage === 2) {
    return send(cart.email, "Une question avant de commander ?", layout({
      heading: "Une question avant de commander ?",
      body: `<p style="margin:0;">Bonjour,</p>
        <p style="margin:12px 0 0;">Votre panier est toujours enregistré. Si un doute vous retient, voici ce qu'il faut savoir :</p>
        <ul style="margin:16px 0 0;padding-left:20px;">
          <li>Chaque pièce est façonnée à la main dans mon atelier, en Bretagne.</li>
          <li>Le paiement est sécurisé par Stripe, sans création de compte.</li>
          <li>La livraison en point relais est offerte dès ${threshold} d'achat.</li>
          <li>Une question sur une personnalisation ou un souvenir à me confier ? Répondez simplement à cet email, je vous réponds moi-même.</li>
        </ul>
        ${itemsTable(cart.items)}
        ${cta}
        <p style="margin:24px 0 0;">Anaïs</p>`,
      footer,
    }));
  }

  const promoCode = process.env.CART_RECOVERY_PROMO_CODE?.trim();
  return send(cart.email, "Dernier rappel pour votre panier", layout({
    heading: "Dernier rappel pour votre panier",
    body: `<p style="margin:0;">Bonjour,</p>
      <p style="margin:12px 0 0;">C'est mon dernier message au sujet de votre panier : je ne vous écrirai plus à ce propos.</p>
      ${promoCode
        ? `<p style="margin:12px 0 0;">Pour vous remercier de votre intérêt, voici un code à saisir au moment du paiement : <strong style="font-family:monospace;font-size:16px;color:#c0583a;">${escapeHtml(promoCode)}</strong></p>`
        : ""}
      ${itemsTable(cart.items)}
      ${cta}`,
    footer,
  }));
}

/* ─── Demande d'avis, 7 jours après la livraison ─── */

export interface ReviewRequest {
  email: string;
  fullName: string;
  orderId: string;
  reviewToken: string;
  items: (EmailItem & { careInstructions?: string })[];
}

export async function sendReviewRequest(req: ReviewRequest): Promise<boolean> {
  const reviewUrl = `${SITE_URL}/avis/${encodeURIComponent(req.orderId)}?t=${req.reviewToken}`;
  const firstName = req.fullName.trim().split(/\s+/)[0] ?? "";

  const care = req.items
    .filter((item) => item.careInstructions?.trim())
    .map((item) => `<li><strong>${escapeHtml(item.name)}</strong> : ${escapeHtml(item.careInstructions!.trim())}</li>`)
    .join("");

  return send(req.email, "Votre création est-elle bien arrivée ?", layout({
    heading: "Votre avis compte beaucoup",
    body: `<p style="margin:0;">Bonjour${firstName ? ` ${escapeHtml(firstName)}` : ""},</p>
      <p style="margin:12px 0 0;">Votre commande ${escapeHtml(req.orderId)} vous a été livrée il y a quelques jours. J'espère qu'elle vous plaît autant que j'ai aimé la réaliser.</p>
      ${care
        ? `<p style="margin:20px 0 6px;font-weight:600;">Pour la garder belle longtemps</p>
           <ul style="margin:0;padding-left:20px;">${care}</ul>`
        : ""}
      <p style="margin:20px 0 0;">Deux minutes suffisent pour partager votre avis. Il aide les personnes qui hésitent, et il m'aide à progresser.</p>
      <p style="text-align:center;margin:28px 0 0;">${button("Donner mon avis", reviewUrl)}</p>
      <p style="margin:28px 0 0;">Merci pour votre confiance,<br>Anaïs</p>`,
    footer: "Une question sur votre commande ? Répondez simplement à cet email.",
  }));
}
