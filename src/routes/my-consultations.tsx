import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { useCustomerAuth, customerSignIn } from "@/lib/customer-auth";
import { getFirebaseDb } from "@/lib/firebase";
import { formatDate, formatTime, type Consultation } from "@/lib/consultations";

export const Route = createFileRoute("/my-consultations")({ component: MyConsultations });

function MyConsultations() {
  const { user, loading } = useCustomerAuth();
  const [items, setItems] = useState<(Consultation & { remedyPdfUrl?: string })[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(getFirebaseDb(), "consultations"), where("userId", "==", user.uid)),
      (snapshot) => setItems(snapshot.docs.map((item) => item.data() as Consultation & { remedyPdfUrl?: string }).sort((a, b) => (b.preferredDate || "").localeCompare(a.preferredDate || ""))),
      () => setError("Your consultation history could not be loaded. Please try again later."));
  }, [user]);
  return <main className="surface-night min-h-screen text-ivory"><Navbar /><section className="mx-auto min-h-[70vh] max-w-4xl px-4 pb-20 pt-36 sm:px-6">
    <p className="eyebrow text-gold">Your account</p><h1 className="display mt-4 text-4xl sm:text-5xl">My consultations</h1>
    {loading ? <p className="mt-8 text-ivory/60">Loading your account…</p> : !user ? <div className="mt-8"><p className="text-ivory/70">Sign in to see your bookings and shared remedies.</p><button onClick={() => void customerSignIn().catch(() => setError("Sign-in could not be completed."))} className="mt-5 rounded-sm bg-gold px-6 py-3 text-sm uppercase tracking-wider text-ink">Continue with Google</button></div> : <>
      <p className="mt-4 text-ivory/60">Signed in as {user.email}</p><Link to="/book-consultation" className="mt-6 inline-block text-sm text-gold underline">Book another consultation</Link>
      {error && <p role="alert" className="mt-6 text-gold-soft">{error}</p>}
      {!items.length && !error ? <p className="mt-8 text-ivory/60">No consultations yet.</p> : <div className="mt-8 grid gap-4">{items.map((item) => <article key={item.consultationId} className="rounded-sm border border-ivory/15 bg-ink-soft/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow text-gold">{item.consultationType}</p><h2 className="mt-2 font-display text-xl">{formatDate(item.preferredDate)} · {formatTime(item.preferredTime)}</h2></div><span className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">{item.status}</span></div>
        <p className="mt-3 text-sm text-ivory/60">Reference {item.consultationId}</p>
        {item.remedyPdfUrl && <a href={item.remedyPdfUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-gold underline">View shared remedy PDF</a>}
      </article>)}</div>}
    </>}
  </section><Footer /></main>;
}
