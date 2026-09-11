import type { Metadata } from "next";
import { BookingForm } from "@/components/booking-form";

export const metadata: Metadata = {
  title: "Book a consultation",
  description: "Timezone-aware booking for a ₹2100 single Kundli consultation.",
};

export default function BookPage() {
  return (
    <div className="container py-16 md:py-24">
      <div className="mb-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold-dark">Booking</p>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Single Kundli consultation</h1>
        <p className="mt-4 text-muted-foreground">
          ₹2100 · 60 minutes · video. Pick a slot in your timezone, then complete checkout. Birth details are stored
          only for chart work.
        </p>
      </div>
      <BookingForm />
    </div>
  );
}
