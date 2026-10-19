import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { COUNTRY_CODES } from "@/lib/consultations";
import { customerRegisterWithEmail, customerSignIn, customerSignInWithEmail, useCustomerAuth } from "@/lib/customer-auth";

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  component: SignInPage,
});

type Mode = "sign-in" | "create-account";
const empty = { name: "", email: "", countryCode: "+91", phone: "", password: "", dateOfBirth: "", timeOfBirth: "", placeOfBirth: "", currentCity: "" };
const inputClass = "mt-2 min-h-12 w-full rounded-sm border border-ivory/20 bg-ink/60 px-4 text-base text-ivory placeholder:text-ivory/35 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/60 [color-scheme:dark]";

function SignInPage() {
  const { returnTo } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useCustomerAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [values, setValues] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destination = returnTo === "/book-consultation" ? "/book-consultation" : "/my-consultations";

  useEffect(() => {
    if (user) navigate({ to: destination, replace: true });
  }, [user, destination, navigate]);

  const set = (key: keyof typeof empty) => (value: string) => setValues((current) => ({ ...current, [key]: value }));

  function message(cause: unknown) {
    const code = (cause as { code?: string })?.code ?? "";
    if (code.includes("email-already-in-use")) return "An account already uses this email. Sign in or choose Google if you registered there.";
    if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
    if (code.includes("weak-password")) return "Choose a password with at least 6 characters.";
    if (code.includes("popup-closed-by-user")) return "Google sign-in was cancelled.";
    if (code.includes("unauthorized-domain")) return "This website domain is not enabled for Firebase Authentication.";
    return (cause as Error)?.message || "We could not complete sign-in. Please try again.";
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    try {
      if (mode === "sign-in") await customerSignInWithEmail(values.email, values.password);
      else {
        const digits = values.phone.replace(/\D/g, "");
        if (values.name.trim().length < 2) throw new Error("Enter your full name.");
        if (digits.length < 6 || digits.length > 14) throw new Error("Enter a valid phone number.");
        if (!values.dateOfBirth || values.placeOfBirth.trim().length < 2 || values.currentCity.trim().length < 2) throw new Error("Complete your birth date, place of birth, and current city.");
        await customerRegisterWithEmail({
          name: values.name, email: values.email, phone: `${values.countryCode}${digits}`, password: values.password,
          birthDetails: { dateOfBirth: values.dateOfBirth, timeOfBirth: values.timeOfBirth, placeOfBirth: values.placeOfBirth, currentCity: values.currentCity },
        });
      }
      navigate({ to: destination, replace: true });
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }

  async function googleSignIn() {
    setBusy(true); setError("");
    try { await customerSignIn(); navigate({ to: destination, replace: true }); }
    catch (cause) { setError(message(cause)); }
    finally { setBusy(false); }
  }

  return <main className="surface-night min-h-screen text-ivory"><Navbar /><section className="mx-auto min-h-[72vh] max-w-xl px-4 pb-20 pt-36 sm:px-6">
    <p className="eyebrow text-gold">Customer account</p><h1 className="display mt-4 text-4xl sm:text-5xl">{mode === "sign-in" ? "Sign in" : "Create your account"}</h1>
    <p className="mt-4 text-sm text-ivory/65">Sign in to book a consultation and keep your details together for future visits.</p>
    {!authLoading && !user && <div className="mt-8 rounded-sm border border-ivory/15 bg-ink-soft/60 p-5 sm:p-7">
      <div className="grid grid-cols-2 border-b border-ivory/15 text-center text-sm"><button type="button" onClick={() => { setMode("sign-in"); setError(""); }} className={`border-b-2 py-3 ${mode === "sign-in" ? "border-gold text-gold" : "border-transparent text-ivory/55"}`}>Sign In</button><button type="button" onClick={() => { setMode("create-account"); setError(""); }} className={`border-b-2 py-3 ${mode === "create-account" ? "border-gold text-gold" : "border-transparent text-ivory/55"}`}>Create Account</button></div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "create-account" && <>
          <label className="block text-sm">Full name<input required autoComplete="name" value={values.name} onChange={(event) => set("name")(event.target.value)} className={inputClass} /></label>
          <label className="block text-sm">Phone number<div className="mt-2 grid grid-cols-[8rem_minmax(0,1fr)] gap-2"><select aria-label="Country code" value={values.countryCode} onChange={(event) => set("countryCode")(event.target.value)} className={inputClass}>{COUNTRY_CODES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select><input required type="tel" autoComplete="tel-national" value={values.phone} onChange={(event) => set("phone")(event.target.value)} className={`${inputClass} mt-0`} /></div></label>
        </>}
        <label className="block text-sm">Email<input required type="email" autoComplete="email" value={values.email} onChange={(event) => set("email")(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm">Password<input required type="password" minLength={6} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={values.password} onChange={(event) => set("password")(event.target.value)} className={inputClass} /></label>
        {mode === "create-account" && <fieldset className="grid gap-4 border-t border-ivory/10 pt-4 sm:grid-cols-2"><legend className="px-1 font-display text-lg text-gold-soft">Birth details</legend>
          <label className="text-sm">Date of birth<input required type="date" max={new Date().toISOString().slice(0, 10)} value={values.dateOfBirth} onChange={(event) => set("dateOfBirth")(event.target.value)} className={inputClass} /></label>
          <label className="text-sm">Time of birth<input type="time" value={values.timeOfBirth} onChange={(event) => set("timeOfBirth")(event.target.value)} className={inputClass} /></label>
          <label className="text-sm">Place of birth<input required value={values.placeOfBirth} onChange={(event) => set("placeOfBirth")(event.target.value)} className={inputClass} /></label>
          <label className="text-sm">Current city<input required autoComplete="address-level2" value={values.currentCity} onChange={(event) => set("currentCity")(event.target.value)} className={inputClass} /></label>
        </fieldset>}
        {error && <p role="alert" className="text-sm text-gold-soft">{error}</p>}
        <button type="submit" disabled={busy} className="min-h-12 w-full rounded-sm bg-gold px-5 text-sm font-medium uppercase tracking-wider text-ink disabled:opacity-60">{busy ? "Please wait…" : mode === "sign-in" ? "Sign In with Email" : "Create Account"}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-ivory/40"><span className="h-px flex-1 bg-ivory/15" />OR<span className="h-px flex-1 bg-ivory/15" /></div>
      <button type="button" disabled={busy} onClick={() => void googleSignIn()} className="min-h-12 w-full rounded-sm border border-ivory/25 px-5 text-sm hover:border-gold disabled:opacity-60">Continue with Google</button>
    </div>}
    {authLoading && <p className="mt-8 text-sm text-ivory/60">Checking your account…</p>}
    <p className="mt-6 text-sm text-ivory/55">Already know what you need? <Link to="/book-consultation" className="text-gold underline">Book a consultation</Link></p>
  </section><Footer /></main>;
}
