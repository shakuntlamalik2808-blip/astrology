import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Shakuntla Malik" }, { name: "description", content: "Privacy Policy for Shakuntla Malik — Jyotish, Counseling & Astrology Academy." }] }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return <LegalPage title="Privacy Policy" intro="This Privacy Policy explains how Shakuntla Malik — Jyotish, Counseling & Astrology Academy (starsandsutra.com) collects and uses information when you visit the website, create an account, book a consultation, or contact us." sections={[
    { title: "Information we collect", paragraphs: ["We collect information you provide for an account or consultation, including your name, email address, phone number, date, time and place of birth, consultation preferences, messages, and any family-member details you choose to provide. We also keep booking status, remedies shared with you, and payment status and transaction references.", "PhonePe processes payment details on its hosted checkout. We do not receive or store full card numbers, UPI PINs, passwords, or bank login credentials."] },
    { title: "How we use information", paragraphs: ["We use this information to manage your account, confirm and conduct consultations, contact you about bookings, prepare and share requested remedies, verify payments, handle support and refund requests, and protect the website from misuse."] },
    { title: "Service providers", paragraphs: ["We use Firebase Authentication, Firestore and Cloud Functions to provide sign-in and booking services; PhonePe to process hosted payments; and email delivery providers to send booking and consultation messages. These providers process information needed to perform their services under their own privacy and security terms."] },
    { title: "Sharing and retention", paragraphs: ["We do not sell personal information. We share it only with the service providers described above, where needed to provide your consultation, or where disclosure is required by law. We retain account, booking, payment and communication records for as long as needed to provide services, resolve disputes, meet legal and accounting requirements, and protect our rights."] },
    { title: "Your choices and security", paragraphs: ["You may request access, correction, or deletion of your account information by contacting us at the email below. Some booking and payment records may need to be retained where required for legal, accounting, or dispute-resolution purposes. We use access controls and service-provider safeguards, but no internet transmission or storage system can be guaranteed completely secure."] },
    { title: "Children and family profiles", paragraphs: ["An adult account holder may provide birth details for a child or another family member when arranging a consultation. The account holder is responsible for having authority to provide those details and for sharing this Policy with the person where appropriate."] },
    { title: "Contact", paragraphs: ["For privacy requests or questions, contact Shakuntla Malik — Jyotish, Counseling & Astrology Academy using the contact email displayed on starsandsutra.com."] },
  ]} />;
}
