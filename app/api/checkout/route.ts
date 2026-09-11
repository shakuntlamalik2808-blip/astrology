import { NextResponse } from "next/server";
import { CONSULTATION_PRICE_INR } from "@/lib/data";

/**
 * Placeholder checkout for Razorpay or Stripe.
 * Wire provider keys from .env and replace the mock order payload.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.name || !body?.slot || !body?.date) {
    return NextResponse.json(
      { error: "Name, email, date, and time slot are required." },
      { status: 400 }
    );
  }

  const amountInr = Number(body.amountInr) || CONSULTATION_PRICE_INR;
  const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "razorpay";

  const order = {
    id: `order_${Date.now()}`,
    provider,
    amountInr,
    currency: "INR",
    kind: body.kind ?? "SINGLE_CONSULTATION",
    customer: { name: body.name, email: body.email },
    slot: { date: body.date, time: body.slot, timezone: body.timezone },
    birth: {
      date: body.birthDate,
      time: body.birthTime,
      place: body.birthPlace,
    },
  };

  return NextResponse.json({
    order,
    message:
      "Placeholder checkout created. Connect Razorpay Orders API or Stripe Checkout Session using this payload.",
  });
}
