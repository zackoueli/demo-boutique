import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { amount, orderId, email, fullName, deliveryType, items, ...rest } = await req.json();

    if (!amount || amount < 50) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      receipt_email: email ?? undefined,
      metadata: {
        orderId: orderId ?? "",
        email: email ?? "",
        fullName: fullName ?? "",
        deliveryType: deliveryType ?? "",
        items: typeof items === "string" ? items.slice(0, 500) : "",
        ...Object.fromEntries(
          Object.entries(rest).map(([k, v]) => [k, String(v ?? "").slice(0, 500)])
        ),
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[stripe] create-payment-intent:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
