import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { SITE_NAME, SITE_URL } from "@/lib/site";

function page(message: string, status = 200) {
  return new Response(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${SITE_NAME}</title></head>
<body style="margin:0;background:#FAF7F2;color:#2C1A0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:440px;margin:18vh auto 0;padding:0 24px;text-align:center;">
    <p style="font-family:Georgia,serif;font-size:22px;font-weight:600;margin:0 0 12px;">${message}</p>
    <a href="${SITE_URL}" style="color:#C0622D;font-size:14px;">Retour à la boutique</a>
  </div>
</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// Lien de désinscription des emails de relance de panier.
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") ?? "";
    const token = req.nextUrl.searchParams.get("t") ?? "";
    if (!/^[a-f0-9]{40}$/.test(id) || !token) return page("Lien invalide.", 400);

    const db = getAdminDb();
    const cartRef = db.collection("carts").doc(id);
    const snap = await cartRef.get();

    // Panier déjà supprimé (commande passée, lien ancien) : plus aucun rappel ne partira
    if (snap.exists) {
      if (snap.data()?.token !== token) return page("Lien invalide.", 400);
      await db.collection("emailOptOuts").doc(id).set({ createdAt: FieldValue.serverTimestamp() });
      await cartRef.delete();
    }

    return page("C'est noté : vous ne recevrez plus de rappel de panier.");
  } catch (err) {
    console.error("[cart/unsubscribe]", err);
    return page("Une erreur est survenue. Réessayez dans un instant.", 500);
  }
}
