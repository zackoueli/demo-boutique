import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/firebase-admin";
import { createShipmentAtMondialRelay, type CreateShipmentPayload } from "@/lib/mondial-relay";

// Création manuelle d'une expédition depuis l'admin (bouton « Réessayer »).
// La création automatique après paiement passe directement par lib/mondial-relay.
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = (await req.json()) as CreateShipmentPayload;

    if (!body.orderId || !body.relayPointId || !body.recipient || !body.weightGrams) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const result = await createShipmentAtMondialRelay(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    console.error("[mondial-relay/create-shipment]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
