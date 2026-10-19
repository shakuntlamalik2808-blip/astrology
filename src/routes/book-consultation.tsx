import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Starfield } from "@/components/site/Starfield";
import {
  COUNTRY_CODES,
  bookingErrorDetails,
  bookingSlotId,
  calculateBirthdayValidity,
  consultationSchema,
  formatDate,
  formatTime,
  logBookingDebug,
  submitConsultation,
  type ConsultationInput,
} from "@/lib/consultations";
import { getMissingFirebaseConfigKeys, isFirebaseConfigured } from "@/lib/firebase-config";
import { getFirebaseDb } from "@/lib/firebase";
import { useWebsiteSettings, WebsiteSettingsProvider } from "@/lib/website-settings";
import { useCustomerAuth, saveCustomerMembers, saveCustomerProfile, type CustomerMember } from "@/lib/customer-auth";
import { doc, getDoc } from "firebase/firestore";

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
  component: BookPageWithSettings,
});

const empty: ConsultationInput = {
  fullName: "",
  countryCode: "+91",
  phone: "",
  email: "",
  dateOfBirth: "",
  timeOfBirth: "",
  placeOfBirth: "",
  consultationType: "" as ConsultationInput["consultationType"],
  preferredDate: "",
  preferredTime: "",
  additionalMessage: "",
};

type Errors = Partial<Record<keyof ConsultationInput, string>>;

const today = () => new Date().toISOString().slice(0, 10);

function formValuesForDebug(values: ConsultationInput) {
  return {
    fullName: values.fullName ? "[redacted]" : "",
    countryCode: values.countryCode,
    phone: values.phone ? `[redacted; ${values.phone.replace(/\D/g, "").length} digits]` : "",
    email: values.email ? "[redacted]" : "",
    dateOfBirth: values.dateOfBirth ? "[redacted]" : "",
    timeOfBirth: values.timeOfBirth ? "[redacted]" : "",
    placeOfBirth: values.placeOfBirth ? "[redacted]" : "",
    consultationType: values.consultationType,
    preferredDate: values.preferredDate,
    preferredTime: values.preferredTime,
    additionalMessage: values.additionalMessage ? `[redacted; ${values.additionalMessage.length} characters]` : "",
  };
}

function BookPageWithSettings() {
  return <WebsiteSettingsProvider><BookPage /></WebsiteSettingsProvider>;
}

function BookPage() {
  const settings = useWebsiteSettings();
  const { user, loading: customerLoading } = useCustomerAuth();
  const reduced = useReducedMotion();
  const submitLock = useRef(false);
  const submitErrorRef = useRef<HTMLParagraphElement>(null);
  const [values, setValues] = useState<ConsultationInput>(empty);
  const [savedProfile, setSavedProfile] = useState<{ name: string; birthDetails: { dateOfBirth?: string; timeOfBirth?: string; placeOfBirth?: string } } | null>(null);
  const [members, setMembers] = useState<CustomerMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("self");
  const [newRelationship, setNewRelationship] = useState<CustomerMember["relationship"]>("Other");
  const [newMemberNotes, setNewMemberNotes] = useState("");
  useEffect(() => {
    if (!user) return;
    void getDoc(doc(getFirebaseDb(), "customers", user.uid)).then((snapshot) => {
      const profile = snapshot.data();
      const birth = profile?.birthDetails ?? {};
      const savedMembers = Array.isArray(profile?.members) ? profile.members as CustomerMember[] : [];
      const requestedMemberId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("memberId");
      const requestedMember = savedMembers.find((member) => member.id === requestedMemberId);
      setSavedProfile({ name: profile?.name || user.displayName || "", birthDetails: birth });
      setMembers(savedMembers);
      setSelectedMemberId(requestedMember?.id ?? "self");
      const rawPhone = String(profile?.phone ?? "");
      const matchedCode = COUNTRY_CODES.find((item) => rawPhone.startsWith(item.code));
      setValues((current) => ({ ...current,
        fullName: current.fullName || requestedMember?.name || profile?.name || user.displayName || "",
        email: current.email || user.email || "",
        countryCode: current.phone ? current.countryCode : (matchedCode?.code ?? current.countryCode),
        phone: current.phone || (matchedCode ? rawPhone.slice(matchedCode.code.length).replace(/\D/g, "") : rawPhone.replace(/\D/g, "")),
        dateOfBirth: current.dateOfBirth || requestedMember?.dateOfBirth || birth.dateOfBirth || "",
        timeOfBirth: current.timeOfBirth || requestedMember?.timeOfBirth || birth.timeOfBirth || "",
        placeOfBirth: current.placeOfBirth || requestedMember?.placeOfBirth || birth.placeOfBirth || "",
      }));
    }).catch(() => {});
  }, [user]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorSequence, setSubmitErrorSequence] = useState(0);
  const [done, setDone] = useState<{ id: string; firstName: string } | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ id: string; date: string; time: string }[]>([]);
  const [bookedSlotIds, setBookedSlotIds] = useState<Set<string>>(new Set());
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      logBookingDebug("error", "firebase_configuration_missing", {
        missingKeys: getMissingFirebaseConfigKeys(),
      });
      setAvailabilityError("Booking is unavailable because Firebase is not configured for this site.");
      setAvailabilityLoading(false);
      setBookingsLoading(false);
      return;
    }
    logBookingDebug("log", "schedule_listeners_start", {
      collections: ["availableSlots", "bookedSlots"],
    });
    const stopAvailability = onSnapshot(collection(getFirebaseDb(), "availableSlots"), (snapshot) => {
      setAvailableSlots(snapshot.docs.flatMap((item) => {
        const slot = item.data();
        return slot["enabled"] && typeof slot["date"] === "string" && typeof slot["time"] === "string"
          ? [{ id: item.id, date: slot["date"], time: slot["time"] }]
          : [];
      }));
      logBookingDebug("log", "schedule_snapshot_received", {
        collection: "availableSlots",
        documentCount: snapshot.size,
      });
      setAvailabilityLoading(false);
      setAvailabilityError(null);
    }, (error) => {
      logBookingDebug("error", "schedule_listener_failed", {
        collection: "availableSlots",
        ...bookingErrorDetails(error),
      });
      const code = (error as { code?: string }).code;
      setAvailabilityError(code === "permission-denied"
        ? "The booking schedule is blocked by Firestore rules. Deploy the current firestore.rules to your Firebase project."
        : "Available consultation times could not be loaded. Please refresh and try again.");
      setAvailabilityLoading(false);
    });
    const stopBookings = onSnapshot(collection(getFirebaseDb(), "bookedSlots"), (snapshot) => {
      setBookedSlotIds(new Set(snapshot.docs.map((item) => item.id)));
      logBookingDebug("log", "schedule_snapshot_received", {
        collection: "bookedSlots",
        documentCount: snapshot.size,
      });
      setBookingsLoading(false);
      setBookingsError(null);
    }, (error) => {
      logBookingDebug("error", "schedule_listener_failed", {
        collection: "bookedSlots",
        ...bookingErrorDetails(error),
      });
      const code = (error as { code?: string }).code;
      setBookingsError(code === "permission-denied"
        ? "The booking schedule is blocked by Firestore rules. Deploy the current firestore.rules to your Firebase project."
        : "Booked consultation times could not be loaded. Please refresh and try again.");
      setBookingsLoading(false);
    });
    return () => { stopAvailability(); stopBookings(); };
  }, []);

  const scheduleLoading = availabilityLoading || bookingsLoading;
  const scheduleError = availabilityError ?? bookingsError;
  const openSlots = availableSlots.filter((slot) => !bookedSlotIds.has(slot.id) && slot.date >= today());
  const availableDates = [...new Set(openSlots.map((slot) => slot.date))].sort();
  const availableTimes = openSlots.filter((slot) => slot.date === values.preferredDate).map((slot) => slot.time).sort();

  const set = (k: keyof ConsultationInput) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    if (submitError) setSubmitError(null);
  };

  function chooseConsultationPerson(id: string) {
    setSelectedMemberId(id);
    if (id === "new") {
      setValues((current) => ({ ...current, fullName: "", dateOfBirth: "", timeOfBirth: "", placeOfBirth: "" }));
      return;
    }
    const member = members.find((item) => item.id === id);
    const birth = member ?? savedProfile?.birthDetails;
    setValues((current) => ({
      ...current,
      fullName: member?.name || savedProfile?.name || current.fullName,
      dateOfBirth: member?.dateOfBirth || birth?.dateOfBirth || "",
      timeOfBirth: member?.timeOfBirth || birth?.timeOfBirth || "",
      placeOfBirth: member?.placeOfBirth || birth?.placeOfBirth || "",
    }));
  }

  const showSubmitError = (message: string) => {
    setSubmitError(message);
    setSubmitErrorSequence((sequence) => sequence + 1);
  };

  useEffect(() => {
    if (!submitError) return;
    requestAnimationFrame(() => {
      submitErrorRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      submitErrorRef.current?.focus({ preventScroll: true });
    });
  }, [submitError, submitErrorSequence, reduced]);

  useEffect(() => {
    if (values.preferredTime && !availableTimes.includes(values.preferredTime)) {
      setValues((current) => ({ ...current, preferredTime: "" }));
    }
  }, [values.preferredDate, availableTimes.join(",")]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      showSubmitError("Please sign in or create an account before booking your consultation.");
      return;
    }
    logBookingDebug("log", "form_submit_event", {
      values: formValuesForDebug(values),
      validationErrorFields: Object.keys(errors),
      scheduleLoading,
      scheduleError: Boolean(scheduleError),
      firebaseConfigured: isFirebaseConfigured(),
      online: navigator.onLine,
    });
    if (submitLock.current || submitting) {
      logBookingDebug("warn", "duplicate_submit_ignored", { submitting, lockActive: submitLock.current });
      return;
    }
    setSubmitError(null);
    const parsed = consultationSchema.safeParse({ ...values, phone: (values.phone ?? "").replace(/[\s-]/g, "") });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof ConsultationInput;
        if (!next[k]) next[k] = issue.message;
      }
      logBookingDebug("warn", "form_validation_failed", {
        errors: parsed.error.issues.map(({ path, message }) => ({ field: path.join("."), message })),
      });
      setErrors(next);
      showSubmitError(`Please correct the following: ${Object.entries(next).map(([field, message]) => `${field}: ${message}`).join(" ")}`);
      return;
    }
    logBookingDebug("log", "form_validation_passed", {
      consultationType: parsed.data.consultationType,
      preferredDate: parsed.data.preferredDate,
      preferredTime: parsed.data.preferredTime,
    });
    if (parsed.data.preferredDate < today()) {
      setErrors({ preferredDate: "Please choose a date from today onwards." });
      logBookingDebug("warn", "selected_date_in_past", { preferredDate: parsed.data.preferredDate, today: today() });
      showSubmitError("Please choose an appointment date from today onwards.");
      return;
    }
    const selectedSlotId = bookingSlotId(parsed.data.preferredDate, parsed.data.preferredTime);
    const selectedSlotIsOpen = openSlots.some((slot) => slot.id === selectedSlotId);
    logBookingDebug(selectedSlotIsOpen ? "log" : "warn", "selected_slot_verified", {
      slotId: selectedSlotId,
      isOpen: selectedSlotIsOpen,
      scheduleLoading,
      scheduleError: scheduleError ?? null,
    });
    if (scheduleError || scheduleLoading || !selectedSlotIsOpen) {
      const message = scheduleError
        ? `We couldn't verify the appointment schedule. ${scheduleError}`
        : scheduleLoading
          ? "The appointment schedule is still loading. Please wait a moment and try again."
          : "That appointment time is no longer available. Please select another date and time.";
      setErrors({ preferredTime: message });
      showSubmitError(message);
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      if (!isFirebaseConfigured()) throw new Error("not configured");
      const chosenMember = members.find((member) => member.id === selectedMemberId);
      let memberId = chosenMember?.id ?? "self";
      let relationship = chosenMember?.relationship ?? "Self";
      if (selectedMemberId === "new") {
        memberId = crypto.randomUUID();
        relationship = newRelationship;
        const newMember: CustomerMember = {
          id: memberId, name: parsed.data.fullName, relationship: newRelationship,
          dateOfBirth: parsed.data.dateOfBirth, timeOfBirth: parsed.data.timeOfBirth ?? "",
          placeOfBirth: parsed.data.placeOfBirth, notes: newMemberNotes.trim(),
        };
        const updatedMembers = [...members, newMember];
        await saveCustomerMembers(user, updatedMembers);
        setMembers(updatedMembers);
      }
      const validity = calculateBirthdayValidity(parsed.data.dateOfBirth, parsed.data.preferredDate);
      await saveCustomerProfile(user, {
        name: savedProfile?.name || parsed.data.fullName,
        phone: `${parsed.data.countryCode}${parsed.data.phone}`,
        birthDetails: selectedMemberId === "self" ? { dateOfBirth: parsed.data.dateOfBirth, timeOfBirth: parsed.data.timeOfBirth ?? "", placeOfBirth: parsed.data.placeOfBirth } : {
          dateOfBirth: savedProfile?.birthDetails.dateOfBirth || "",
          timeOfBirth: savedProfile?.birthDetails.timeOfBirth || "",
          placeOfBirth: savedProfile?.birthDetails.placeOfBirth || "",
        },
      });
      const id = await submitConsultation(parsed.data, user.uid, {
        memberId, memberName: parsed.data.fullName, relationship,
        bookedByName: savedProfile?.name || user.displayName || parsed.data.fullName,
        validFrom: validity.validFrom, validUntil: validity.validUntil,
      });
      logBookingDebug("log", "form_submission_success", { referenceId: id, slotId: selectedSlotId });
      setDone({ id, firstName: parsed.data.fullName.split(" ")[0] ?? "" });
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    } catch (err) {
      logBookingDebug("error", "form_submission_failed", {
        slotId: selectedSlotId,
        firebaseConfigured: isFirebaseConfigured(),
        ...bookingErrorDetails(err),
      });
      const code = (err as { code?: string })?.code;
      if (!isFirebaseConfigured()) {
        showSubmitError("Booking is unavailable because Firebase is not configured for this site.");
      } else if (code === "permission-denied" || (err instanceof Error && err.message.includes("Missing or insufficient permissions"))) {
        showSubmitError("Your request could not be saved because Firestore denied the write. Deploy the current firestore.rules file to your Firebase project, then try again.");
      } else if (code === "unavailable" || code === "deadline-exceeded") {
        showSubmitError("We couldn't reach Firestore. Check your connection and try submitting again.");
      } else if (err instanceof Error && err.message.includes("no longer available")) {
        showSubmitError(err.message);
        setValues((current) => ({ ...current, preferredTime: "" }));
      } else if (err instanceof Error && err.message.includes("just booked")) {
        showSubmitError(err.message);
        setValues((current) => ({ ...current, preferredTime: "" }));
      } else {
        showSubmitError(err instanceof Error ? `We couldn't save your request: ${err.message}` : "We couldn't save your request. Please try again in a moment.");
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  const fade = reduced
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as const } };

  if (customerLoading) return <main className="surface-night min-h-screen text-ivory"><Navbar /><section className="mx-auto max-w-3xl px-4 pt-40 text-center"><p className="text-ivory/65">Checking your account…</p></section><Footer /></main>;

  if (!user) return <main className="surface-night min-h-screen text-ivory"><Navbar /><section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-32 text-center sm:px-6"><p className="eyebrow text-gold">Customer account</p><h1 className="display mt-5 text-4xl sm:text-5xl">Sign in to book</h1><p className="mt-5 max-w-xl text-ivory/65">Create an account or sign in to continue to consultation booking. Your saved details will be ready in the form.</p><Link to="/sign-in" search={{ returnTo: "/book-consultation" }} className="mt-8 inline-flex min-h-12 items-center rounded-sm bg-gold px-7 text-sm font-medium uppercase tracking-wider text-ink">Sign in or create account</Link><Link to="/" className="mt-5 text-sm text-ivory/55 underline">Return to the public site</Link></section><Footer /></main>;

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
                <h1 className="display mt-5 text-[2.35rem] leading-tight sm:mt-6 sm:text-5xl md:text-6xl">{settings.bookingContent}</h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-ivory/70 sm:mt-6 sm:text-lg">
                  Share a few details with us and we'll get back to you regarding your consultation.
                </p>

                <motion.form
                  noValidate
                  onSubmit={onSubmit}
                  onInvalidCapture={(event) => {
                    const target = event.target;
                    logBookingDebug("warn", "native_field_validation_failed", {
                      field: target instanceof HTMLElement ? target.id || target.getAttribute("name") : "unknown",
                      validityMessage: target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement
                        ? target.validationMessage
                        : null,
                    });
                  }}
                  initial={reduced ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-10 rounded-sm border border-ivory/12 bg-ink-soft/60 p-4 backdrop-blur-sm sm:mt-14 sm:p-6 md:p-10"
                >
                  <Group title="Personal information">
                    <Field id="consultationFor" label="Who is this consultation for?" full>
                      <select id="f-consultationFor" value={selectedMemberId} onChange={(event) => chooseConsultationPerson(event.target.value)} className={inputCls}>
                        <option value="self" className="bg-ink">Myself</option>
                        {members.map((member) => <option key={member.id} value={member.id} className="bg-ink">{member.name} · {member.relationship}</option>)}
                        <option value="new" className="bg-ink">+ Add New Member</option>
                      </select>
                    </Field>
                    {selectedMemberId === "new" && <>
                      <Field id="memberRelationship" label="Relationship">
                        <select value={newRelationship} onChange={(event) => setNewRelationship(event.target.value as CustomerMember["relationship"])} className={inputCls}>
                          {["Spouse", "Child", "Parent", "Friend", "Other"].map((relationship) => <option key={relationship} className="bg-ink">{relationship}</option>)}
                        </select>
                      </Field>
                      <Field id="memberNotes" label="Notes (optional)">
                        <input value={newMemberNotes} onChange={(event) => setNewMemberNotes(event.target.value)} className={inputCls} />
                      </Field>
                    </>}
                    <Field id="fullName" label="Person’s full name" error={errors.fullName} full>
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
                    <Field id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth}>
                      <input id="f-dateOfBirth" type="date" max={today()} value={values.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="timeOfBirth" label="Time of birth">
                      <input id="f-timeOfBirth" type="time" value={values.timeOfBirth} onChange={(e) => set("timeOfBirth")(e.target.value)} className={inputCls} />
                    </Field>
                    <Field id="placeOfBirth" label="Place of birth" error={errors.placeOfBirth}>
                      <input id="f-placeOfBirth" value={values.placeOfBirth} onChange={(e) => set("placeOfBirth")(e.target.value)} className={inputCls} />
                    </Field>
                  </Group>

                  <Group title="Consultation details">
                    <Field id="consultationType" label="Consultation type" error={errors.consultationType} full>
                      <select id="f-consultationType" value={values.consultationType} onChange={(e) => set("consultationType")(e.target.value)} className={inputCls}>
                        <option value="" className="bg-ink">Choose a consultation</option>
                        {[...new Set([...settings.services.map((service) => service.name), "General Consultation"])].map((t) => (
                          <option key={t} value={t} className="bg-ink">{t}</option>
                        ))}
                      </select>
                    </Field>
                    <Field id="preferredDate" label="Preferred date" error={errors.preferredDate}>
                      <select id="f-preferredDate" value={values.preferredDate} onChange={(e) => { set("preferredDate")(e.target.value); set("preferredTime")(""); }} disabled={scheduleLoading || Boolean(scheduleError) || availableDates.length === 0} className={`${inputCls} disabled:opacity-50`}>
                        <option value="" className="bg-ink">{scheduleLoading ? "Loading available dates…" : "Choose an available date"}</option>
                        {availableDates.map((date) => <option key={date} value={date} className="bg-ink">{formatDate(date)}</option>)}
                      </select>
                    </Field>
                    <Field id="preferredTime" label="Preferred time" error={errors.preferredTime}>
                      <select id="f-preferredTime" value={values.preferredTime} onChange={(e) => set("preferredTime")(e.target.value)} disabled={!values.preferredDate || availableTimes.length === 0} className={`${inputCls} disabled:opacity-50`}>
                        <option value="" className="bg-ink">{values.preferredDate ? "Choose an available time" : "Choose a date first"}</option>
                        {availableTimes.map((time) => <option key={time} value={time} className="bg-ink">{formatTime(time)}</option>)}
                      </select>
                      {scheduleError && <p role="alert" className="mt-2 text-sm text-gold-soft">{scheduleError}</p>}
                      {!scheduleError && scheduleLoading && <p className="mt-2 text-sm text-ivory/50">Loading the appointment calendar…</p>}
                      {!scheduleError && !scheduleLoading && availableDates.length === 0 && <p className="mt-2 text-sm text-ivory/50">No appointment times are available right now. Please check back soon.</p>}
                    </Field>
                    <Field id="additionalMessage" label="Additional message" hint="Optional" error={errors.additionalMessage} full>
                      <textarea id="f-additionalMessage" rows={4} placeholder="Tell us anything you'd like us to know before the consultation..." value={values.additionalMessage} onChange={(e) => set("additionalMessage")(e.target.value)} className={`${inputCls} min-h-28 resize-y py-3`} />
                    </Field>
                  </Group>

                  {submitError && (
                    <p
                      ref={submitErrorRef}
                      role="alert"
                      aria-live="assertive"
                      tabIndex={-1}
                      className="mt-8 rounded-sm border border-terracotta/60 bg-terracotta/15 px-4 py-3 text-sm text-ivory focus:outline-2 focus:outline-offset-2 focus:outline-gold"
                    >
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !user}
                    onClick={() => logBookingDebug("log", "submit_button_clicked", {
                      values: formValuesForDebug(values),
                      validationErrorFields: Object.keys(errors),
                      submitting,
                      scheduleLoading,
                      scheduleError: Boolean(scheduleError),
                    })}
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
