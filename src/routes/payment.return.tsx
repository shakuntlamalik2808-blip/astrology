import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { httpsCallable } from "firebase/functions";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { getFirebaseApp } from "@/lib/firebase";
import { useCustomerAuth } from "@/lib/customer-auth";
import { WebsiteSettingsProvider } from "@/lib/website-settings";
import { getFunctions } from "firebase/functions";

export const Route = createFileRoute("/payment/return")({
  ssr: false,
  validateSearch: z.object({ merchantOrderId: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Payment status — Shakuntla Malik" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentReturnPage,
});

type VerificationResult = { state: string; consultationId?: string };
type ResultState = "checking" | "pending" | "confirmed" | "failed" | "issue" | "error";

function PaymentReturnPage() {
  const { merchantOrderId: requestedOrderId } = Route.useSearch();
  const { user, loading } = useCustomerAuth();
  const merchantOrderId = requestedOrderId || "";
  const [resultState, setResultState] = useState<ResultState>("checking");
  const [consultationId, setConsultationId] = useState("");
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    if (!merchantOrderId || !user) return;
    setResultState("checking");
    setError("");
    try {
      const callable = httpsCallable<{ merchantOrderId: string }, VerificationResult>(
        getFunctions(getFirebaseApp(), "asia-south1"),
        "verifyPhonePePayment",
      );
      const response = await callable({ merchantOrderId });
      const next = response.data;
      if (next.consultationId) setConsultationId(next.consultationId);
      if (next.state === "CONFIRMED") setResultState("confirmed");
      else if (next.state === "FAILED" || next.state === "EXPIRED") setResultState("failed");
      else if (next.state === "PAID_SLOT_CONFLICT" || next.state === "REVIEW_REQUIRED") setResultState("issue");
      else setResultState("pending");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not check the payment status yet.");
      setResultState("error");
    }
  }, [merchantOrderId, user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setResultState("error");
      setError("Sign in to the account used to start this payment to view its status.");
      return;
    }
    if (!merchantOrderId) {
      setResultState("error");
      setError("No payment reference was provided. Open this page from the PhonePe checkout return link.");
      return;
    }
    void verify();
  }, [loading, user, merchantOrderId, verify]);

  const heading = resultState === "confirmed" ? "Consultation confirmed"
    : resultState === "failed" ? "Payment not completed"
      : resultState === "issue" ? "We’re checking your booking"
        : resultState === "pending" ? "Payment is still processing"
          : "Checking your payment";

  return <WebsiteSettingsProvider>
    <main className="relative min-h-screen">
      <Navbar />
      <section className="surface-night flex min-h-[70vh] items-center px-5 pb-16 pt-32 text-ivory sm:px-8">
        <div className="mx-auto w-full max-w-2xl rounded-sm border border-ivory/15 bg-ink-soft/70 p-6 text-center sm:p-10">
          <p className="eyebrow text-gold">PhonePe payment status</p>
          <h1 className="display mt-5 text-3xl sm:text-4xl">{heading}</h1>
          {resultState === "confirmed" && <>
            <p className="mt-5 text-ivory/75">Your payment has been verified and your appointment is booked.</p>
            <p className="mt-4 text-sm text-ivory/55">Consultation reference: <span className="text-gold-soft">{consultationId}</span></p>
          </>}
          {resultState === "pending" && <p className="mt-5 text-ivory/75">PhonePe has not reported a final payment status yet. You can check again shortly.</p>}
          {resultState === "failed" && <p className="mt-5 text-ivory/75">PhonePe did not confirm this payment, so no appointment was booked. You can return to the booking form and select another slot.</p>}
          {resultState === "issue" && <p className="mt-5 text-ivory/75">PhonePe reports a completed payment, but the selected time could not be confirmed. Your payment is recorded for review. Please contact us so we can arrange a new time or refund.</p>}
          {(resultState === "error" || resultState === "checking") && <p role={resultState === "error" ? "alert" : undefined} className="mt-5 text-ivory/70">{error || "Verifying directly with PhonePe…"}</p>}
          <p className="mt-4 text-xs text-ivory/45">Payment reference: {merchantOrderId || "Not available"}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {(resultState === "pending" || resultState === "error") && <button type="button" onClick={() => void verify()} disabled={!user || !merchantOrderId} className="inline-flex min-h-11 items-center rounded-sm bg-gold px-5 text-sm font-medium text-ink hover:bg-gold-soft disabled:opacity-50">Check status again</button>}
            {!user && !loading && merchantOrderId && <Link to="/sign-in" search={{ returnTo: "/payment/return", merchantOrderId }} className="inline-flex min-h-11 items-center rounded-sm bg-gold px-5 text-sm font-medium text-ink hover:bg-gold-soft">Sign in to check payment</Link>}
            {resultState === "confirmed" && <Link to="/my-consultations" className="inline-flex min-h-11 items-center rounded-sm bg-gold px-5 text-sm font-medium text-ink hover:bg-gold-soft">View my consultations</Link>}
            {(resultState === "failed" || resultState === "issue") && <Link to="/book-consultation" className="inline-flex min-h-11 items-center rounded-sm bg-gold px-5 text-sm font-medium text-ink hover:bg-gold-soft">Return to booking</Link>}
            <Link to="/" className="inline-flex min-h-11 items-center rounded-sm border border-ivory/30 px-5 text-sm text-ivory hover:border-gold">Back to home</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  </WebsiteSettingsProvider>;
}
