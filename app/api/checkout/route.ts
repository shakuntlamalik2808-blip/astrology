import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.email || !body?.name || !body?.slot || !body?.date) {
    return NextResponse.json(
      { error: "Name, email, date, and time slot are required." },
      { status: 400 }
    );
  }

  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919000000000").replace(/\D/g, "");
  const message = [
    "Hello, I would like to book a consultation.",
    `Name: ${String(body.name)}`,
    `Email: ${String(body.email)}`,
    `Preferred timezone: ${String(body.timezone ?? "") || "Not provided"}`,
    `Preferred date: ${String(body.date)}`,
    `Preferred slot: ${String(body.slot)}`,
    `Birth date: ${String(body.birthDate ?? "Not provided")}`,
    `Birth time: ${String(body.birthTime ?? "Not provided")}`,
    `Birth place: ${String(body.birthPlace ?? "Not provided")}`,
    "Please confirm the booking.",
  ].join("\n");

  return NextResponse.json({
    message: "No payment flow is active. Please send the booking request by WhatsApp.",
    whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
  });
}
