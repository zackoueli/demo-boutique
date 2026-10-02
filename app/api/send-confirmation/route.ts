import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sendOrderConfirmation, type ConfirmationPayload } from "@/lib/order-emails";

function checkInternalSecret(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-internal-secret") ?? "";
  try {
    return timingSafeEqual(Buffer.from(secret), Buffer.from(provided));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkInternalSecret(req)) {
      return NextResponse.json({ ok: false, error: "Non autorisé" }, { status: 401 });
    }

    const body: ConfirmationPayload = await req.json();

    if (!body.orderId || typeof body.orderId !== "string" || body.orderId.length > 100) {
      return NextResponse.json({ ok: false, error: "orderId invalide" }, { status: 400 });
    }

    const result = await sendOrderConfirmation(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "Email invalide" ? 400 : 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[send-confirmation] Unexpected error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
