import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({ meta: [{ title: "Refund & Cancellation Policy — Shakuntla Malik" }, { name: "description", content: "Refund and cancellation terms for consultations booked at starsandsutra.com." }] }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return <LegalPage title="Refund & Cancellation Policy" intro="This policy applies to paid consultations booked through starsandsutra.com and operated by Shakuntla Malik — Jyotish, Counseling & Astrology Academy." sections={[
    { title: "Customer cancellations", paragraphs: ["Contact us at least 24 hours before the scheduled consultation to cancel and request a full refund, or ask to reschedule. Requests made less than 24 hours before the appointment may be offered one reschedule at our discretion, subject to availability. Missed appointments and consultations that have already begun are not refundable, except where applicable law requires otherwise."] },
    { title: "Cancellation by us", paragraphs: ["If we need to cancel or cannot provide a confirmed consultation, you may choose a new appointment time or receive a full refund of the amount paid for that booking."] },
    { title: "Payment or slot issues", paragraphs: ["If PhonePe shows a completed payment but our booking page does not confirm the appointment, do not pay again immediately. Contact us with your merchant order ID or PhonePe transaction reference. We will verify the payment and either confirm an available appointment, arrange a reschedule, or issue a refund if we cannot provide the service.", "Failed or abandoned payment attempts do not create a confirmed booking. If an amount is debited despite a failed status, contact us with the payment reference so we can verify it with PhonePe."] },
    { title: "Refund processing", paragraphs: ["Approved refunds are initiated to the original payment method. The time taken for the amount to appear depends on PhonePe, your bank, and the payment method. We will share the refund reference when one is available."] },
    { title: "How to request a cancellation or refund", paragraphs: ["Email the contact address displayed on starsandsutra.com with your name, consultation reference, scheduled date, and PhonePe transaction reference if available. Do not include your UPI PIN, card security code, or banking password."] },
  ]} />;
}
