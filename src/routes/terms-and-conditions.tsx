import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({ meta: [{ title: "Terms & Conditions — Shakuntla Malik" }, { name: "description", content: "Terms and Conditions for astrology and counseling services." }] }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage title="Terms & Conditions" intro="These terms apply when you use starsandsutra.com or book services from Shakuntla Malik — Jyotish, Counseling & Astrology Academy. By using the website or making a booking, you agree to these terms." sections={[
    { title: "Services", paragraphs: ["We offer astrology and Jyotish consultations, Vastu guidance, match-making consultations, counseling-led discussions, and related remedies as described on the website. The exact scope, format, fee, and appointment time are shown during booking or confirmed with you.", "Astrology and counseling services are for personal reflection and general guidance. They are not medical, mental-health, legal, financial, or emergency services and do not replace advice from qualified professionals. No particular outcome is promised or guaranteed."] },
    { title: "Booking and payment", paragraphs: ["You must provide accurate contact information and, where relevant, accurate birth details. A requested appointment is confirmed only after PhonePe reports a successful payment and the appointment slot is reserved in our system. A payment redirect or screenshot alone does not confirm a booking.", "Prices are shown in Indian rupees and charged through PhonePe hosted checkout. Keep your payment reference for support. If a payment succeeds but the selected slot cannot be confirmed, contact us; we will arrange a suitable alternative or process a refund under the Refund Policy."] },
    { title: "Consultations and remedies", paragraphs: ["Please attend at the agreed time and provide any information needed for the session. Remedies and guidance are personal to the consultation and should be followed at your own discretion. Any stated validity period for a consultation or remedy is shown on the consultation record or remedy document."] },
    { title: "Acceptable use and intellectual property", paragraphs: ["Do not misuse the website, attempt unauthorized access, interfere with its operation, or submit unlawful or harmful material. Website content, consultation materials, and remedies may not be copied, sold, or republished without written permission, except for your personal use."] },
    { title: "Changes and contact", paragraphs: ["We may update service details or these terms. The version on this page applies to new bookings from its stated update date. If a change materially affects an existing booking, we will contact you where reasonably possible. Contact us using the email displayed on starsandsutra.com with questions about these terms."] },
  ]} />;
}
