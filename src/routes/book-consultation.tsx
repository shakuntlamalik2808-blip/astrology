import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Starfield } from "@/components/site/Starfield";
import {
  CONSULTATION_TYPES,
  COUNTRY_CODES,
  consultationSchema,
  formatDate,
  formatTime,
  submitConsultation,
  type ConsultationInput,
} from "@/lib/consultations";
import { isFirebaseConfigured } from "@/lib/firebase";

const title = "Book a Consultation — Shakuntla Malik";
const description =
  "Request a Kundli, Vastu, Match Making or general Jyotish consultation with Shakuntla Malik. Share your details and we'll reach you on WhatsApp.";

export const Route = createFileRoute("/book-consultation")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookPage,
});

const empty: ConsultationInput = {
  fullName: "",
  countryCode: "+91",
  phone: "",
  email: "",
  dateOfBirth: "",
  timeOfBirth: "",
  placeOfBirth: "",
  currentCity: "",
  consultationType: "" as ConsultationInput["consultationType"],
  preferredDate: "",
  preferredTime: "",
  additionalMessage: "",
};

type Errors = Partial<Record<keyof ConsultationInput, string>>;

const today = () => new Date().toISOString().slice(0, 10);

function BookPage() {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<ConsultationInput>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; firstName: string } | null>(null);

  const set = (k: keyof ConsultationInput) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    const parsed = consultationSchema.safeParse({ ...values, phone: (values.phone ?? "").replace(/[\s-]/g, "") });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof ConsultationInput;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      document.getElementById(`f-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    if (parsed.data.preferredDate < today()) {
      setErrors({ preferredDate: "Please choose a date from today onwards." });
      return;
    }
    setSubmitting(true);
    try {
      if (!isFirebaseConfigured()) throw new Error("not configured");
      const id = await submitConsultation(parsed.data);
      setDone({ id, firstName: parsed.data.fullName.split(" ")[0] ?? "" });
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    } catch (err) {
      console.error(err);
      setSubmitError("We couldn't submit your request right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const fade = reduced
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <main className="relative">
      <Navbar />
      <section className="surface-night relative overflow-hidden pb-20 pt-28 text-ivory sm:pb-24 sm:pt-36 md:pb-32 md:pt-44">
        <Starfield count={40} />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" {...fade} className="text-center">
                <p className="eyebrow text-gold">Request received</p>
                <h1 className="display mt-6 text-4xl md:text-5xl">Consultation Request Received</h1>
                <p className="mt-6 text-lg text-ivory/80">Thank you, {done.firstName}.</p>
                <p className="mx-auto mt-3 max-w-xl text-ivory/65">
                  Your consultation request has been received successfully. We'll review your details and contact
                  you shortly on WhatsApp regarding your preferred consultation time.
                </p>
                <dl className="mx-auto mt-10 grid max-w-xl gap-px overflow-hidden rounded-sm border border-ivory/15 bg-ivory/15 text-left sm:grid-cols-2">
                  {[
                    ["Consultation", values.consultationType],
                    ["Reference ID", done.id],
                    ["Preferred date", formatDate(values.preferredDate)],
                    ["Preferred time", formatTime(values.preferredTime)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-ink px-5 py-4">
                      <dt className="text-[0.7rem] uppercase tracking-[0.16em] text-ivory/50">{k}</dt>
                      <dd className="mt-1 break-words font-display text-ivory">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link to="/" className="inline-flex min-h-12 items-center rounded-sm bg-gold px-7 text-[0.76rem] font-medium uppercase tracking-[0.14em] text-ink transition-colors duration-200 hover:bg-gold-soft">
                    Back to Home
                  </Link>
                  <a href="/#services" className="inline-flex min-h-12 items-center rounded-sm border border-ivory/35 px-7 text-[0.76rem] font-medium uppercase tracking-[0.14em] transition-colors duration-200 hover:border-ivory/70">
                    Explore Our Services
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" {...fade}>
                <p className="eyebrow text-gold">Book a Consultation</p>
                <h1 className="display mt-5 text-[2.35rem] leading-tight sm:mt-6 sm:text-5xl md:text-6xl">Let's begin your journey toward clarity.</h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-ivory/70 sm:mt-6 sm:text-lg">
                  Share a few details with us and we'll get back to you regarding your consultation.
                </p>

                <motion.form
                  noValidate
                  onSubmit={onSubmit}
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-10 rounded-sm border border-ivory/12 bg-ink-soft/60 p-4 backdrop-blur-sm sm:mt-14 sm:p-6 md:p-10"
                >
                  <Group title="Personal information">
                    <Field id="fullName" label="Full name" error={errors.fullName} full>
                      <input id="f-fullName" autoComplete="name" value={values.fullName} onChange={(e) => set("fullName")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="phone" label="WhatsApp number" error={errors.phone}>
                      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
                        <select aria-label="Country code" value={values.countryCode} onChange={(e) => set("countryCode")(e.target.value)} className={`${inputCls} min-w-0 px-2 sm:px-3`}>
                          {COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code} className="bg-ink">{c.label}</option>
                          ))}
                        </select>
                        <input id="f-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={values.phone} onChange={(e) => set("phone")(e.target.value)} className={inputCls} />
                      </div>
                    </Field>
                    <Field id="email" label="Email" error={errors.email}>
                      <input id="f-email" type="email" autoComplete="email" value={values.email} onChange={(e) => set("email")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth}>
                      <input id="f-dateOfBirth" type="date" max={today()} value={values.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="timeOfBirth" label="Time of birth" hint="Optional, but helps accuracy">
                      <input id="f-timeOfBirth" type="time" value={values.timeOfBirth} onChange={(e) => set("timeOfBirth")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="placeOfBirth" label="Place of birth" error={errors.placeOfBirth}>
                      <input id="f-placeOfBirth" value={values.placeOfBirth} onChange={(e) => set("placeOfBirth")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="currentCity" label="Current city" error={errors.currentCity}>
                      <input id="f-currentCity" autoComplete="address-level2" value={values.currentCity} onChange={(e) => set("currentCity")(e.target.value)} className={inputCls} />
                    </Field>
                  </Group>

                  <Group title="Consultation details">
                    <Field id="consultationType" label="Consultation type" error={errors.consultationType} full>
                      <select id="f-consultationType" value={values.consultationType} onChange={(e) => set("consultationType")(e.target.value)} className={inputCls}>
                        <option value="" className="bg-ink">Choose a consultation</option>
                        {CONSULTATION_TYPES.map((t) => (
                          <option key={t} value={t} className="bg-ink">{t}</option>
                        ))}
                      </select>
                    </Field>
                    <Field id="preferredDate" label="Preferred date" error={errors.preferredDate}>
                      <input id="f-preferredDate" type="date" min={today()} value={values.preferredDate} onChange={(e) => set("preferredDate")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="preferredTime" label="Preferred time" error={errors.preferredTime}>
                      <input id="f-preferredTime" type="time" value={values.preferredTime} onChange={(e) => set("preferredTime")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="additionalMessage" label="Additional message" hint="Optional" error={errors.additionalMessage} full>
                      <textarea id="f-additionalMessage" rows={4} placeholder="Tell us anything you'd like us to know before the consultation..." value={values.additionalMessage} onChange={(e) => set("additionalMessage")(e.target.value)} className={`${inputCls} min-h-28 resize-y py-3`} />
                    </Field>
                  </Group>

                  {submitError && (
                    <p role="alert" className="mt-8 rounded-sm border border-terracotta/60 bg-terracotta/15 px-4 py-3 text-sm text-ivory">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-10 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-sm bg-gold px-8 text-[0.78rem] font-medium uppercase tracking-[0.14em] text-ink transition-colors duration-200 hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
                  >
                    {submitting && <span className="size-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden />}
                    {submitting ? "Submitting..." : "Submit Consultation Request"}
                  </button>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      <Footer />
    </main>
  );
}

const inputCls =
  "min-h-12 w-full rounded-sm border border-ivory/20 bg-ink/60 px-4 text-base text-ivory placeholder:text-ivory/35 transition-[border-color,box-shadow] duration-200 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/60 [color-scheme:dark]";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mb-10 last-of-type:mb-0">
      <legend className="mb-6 font-display text-xl text-gold-soft">{title}</legend>
      <div className="grid gap-6 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ id, label, error, hint, full, children }: { id: string; label: string; error?: string | undefined; hint?: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : undefined}>
      <label htmlFor={`f-${id}`} className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 text-[0.75rem] uppercase tracking-[0.08em] text-ivory/70 sm:text-[0.78rem]">
        {label}
        {hint && <span className="text-right normal-case tracking-normal text-ivory/40">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-2 text-sm text-gold-soft" role="alert">{error}</p>}
    </div>
  );
}
