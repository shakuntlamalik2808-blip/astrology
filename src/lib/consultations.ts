import type { Timestamp } from "firebase/firestore";
import { z } from "zod";

type BookingDebugLevel = "log" | "warn" | "error";

export function logBookingDebug(
  level: BookingDebugLevel,
  event: string,
  details: Record<string, unknown> = {},
) {
  const entry = { event, timestamp: new Date().toISOString(), ...details };
  if (level === "error") {
    console.error("[BookingDebug]", entry);
  } else if (level === "warn") {
    console.warn("[BookingDebug]", entry);
  } else {
    console.log("[BookingDebug]", entry);
  }
}

export function bookingErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const firebaseError = error as Error & { code?: string };
    return {
      errorName: error.name,
      errorCode: firebaseError.code ?? null,
      errorMessage: error.message,
      errorStack: error.stack ?? null,
    };
  }
  const nonError = error as { code?: string; stack?: string } | null;
  return {
    errorName: typeof error,
    errorCode: nonError?.code ?? null,
    errorMessage: String(error),
    errorStack: nonError?.stack ?? null,
  };
}

export const CONSULTATION_TYPES = [
  "Kundli Consultation",
  "Vastu Consultation",
  "Match Making",
  "General Consultation",
] as const;

export const STATUSES = [
  "New",
  "Contacted",
  "Confirmed",
  "Completed",
  "Cancelled",
  "Follow-up Required",
] as const;
export type ConsultationStatus = (typeof STATUSES)[number];

export const PAYMENT_STATUSES = ["Unpaid", "Partially paid", "Paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "USA / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+64", label: "New Zealand (+64)" },
  { code: "+49", label: "Germany (+49)" },
] as const;

const clean = (s: string) => s.replace(/[<>]/g, "").trim();

export const consultationSchema = z.object({
  fullName: z.string().transform(clean).pipe(z.string().min(2, "Please enter your full name.").max(100)),
  countryCode: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().trim().regex(/^\d{6,14}$/, "Please enter a valid WhatsApp number."),
  email: z.string().trim().max(255).email("Please enter a valid email address.").or(z.literal("")).optional().default(""),
  dateOfBirth: z.string().min(1, "Please enter your date of birth."),
  timeOfBirth: z.string().optional().default(""),
  placeOfBirth: z.string().transform(clean).pipe(z.string().min(2, "Please enter your place of birth.").max(120)),
  consultationType: z.string().min(2, "Please choose a consultation type.").max(100),
  preferredDate: z.string().min(1, "Please choose a preferred date."),
  preferredTime: z.string().min(1, "Please choose a preferred time."),
  additionalMessage: z.string().transform(clean).pipe(z.string().max(1500, "Please keep your message under 1500 characters.")),
});
export type ConsultationInput = z.input<typeof consultationSchema>;
export type ConsultationData = z.output<typeof consultationSchema>;

export type Consultation = {
  consultationId: string;
  fullName: string;
  whatsappNumber: string;
  email: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  consultationType: string;
  preferredDate: string;
  preferredTime: string;
  additionalMessage: string;
  source: string;
  status: ConsultationStatus;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  notes?: string;
  archived?: boolean;
  customerId?: string;
  bookedByName?: string;
  memberId?: string;
  memberName?: string;
  relationship?: string;
  validFrom?: string;
  validUntil?: string;
  remedyPdfUrl?: string;
  remediesHindi?: string;
  remediesEnglish?: string;
  remedyLanguage?: "Hindi" | "English";
  remediesSentAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export function makeConsultationId() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 5)
    .toUpperCase();
  return `SS-${ymd}-${rand}`;
}

export const bookingSlotId = (date: string, time: string) => `${date}_${time}`;

/** Validity starts on the consultation date and ends at the next birthday after it. */
export function calculateBirthdayValidity(dateOfBirth: string, validFrom: string) {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [year, month, day] = validFrom.split("-").map(Number);
  if (![birthYear, birthMonth, birthDay, year, month, day].every(Number.isInteger)) {
    throw new Error("Enter a valid birth date and consultation date.");
  }
  const start = Date.UTC(year, month - 1, day);
  let birthdayYear = year;
  let birthday = Date.UTC(birthdayYear, birthMonth - 1, birthDay);
  if (birthday <= start) birthday = Date.UTC(++birthdayYear, birthMonth - 1, birthDay);
  const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
  return { validFrom: iso(start), validUntil: iso(birthday) };
}

const LAST_KEY = "ss_last_submission";

/** Writes the consultation. Customer linking + WhatsApp happen server-side (Cloud Function). */
export async function submitConsultation(
  data: ConsultationData,
  userId: string,
  member: { memberId: string; memberName: string; relationship: string; validFrom: string; validUntil: string; bookedByName: string },
): Promise<string> {
  const fingerprint = `${userId}|${member.memberId}|${data.email}|${data.phone}|${data.consultationType}|${data.preferredDate}|${data.preferredTime}`;
  const slotId = bookingSlotId(data.preferredDate, data.preferredTime);
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as { f: string; t: number; id: string } | null;
    if (last && last.f === fingerprint && Date.now() - last.t < 2 * 60 * 1000) {
      logBookingDebug("warn", "duplicate_submission_suppressed", { referenceId: last.id, slotId });
      return last.id;
    }
  } catch (error) {
    logBookingDebug("warn", "duplicate_guard_unavailable", bookingErrorDetails(error));
  }

  const id = makeConsultationId();
  logBookingDebug("log", "transaction_start", {
    referenceId: id,
    slotId,
    consultationType: data.consultationType,
    preferredDate: data.preferredDate,
    preferredTime: data.preferredTime,
  });
  const [{ collection, doc, runTransaction, serverTimestamp }, { getFirebaseDb }] = await Promise.all([
    import("firebase/firestore"),
    import("./firebase"),
  ]);
  const db = getFirebaseDb();
  let transactionAttempt = 0;
  try {
    await runTransaction(db, async (transaction) => {
      transactionAttempt += 1;
      logBookingDebug("log", "transaction_attempt", { referenceId: id, slotId, attempt: transactionAttempt });
      const availabilityRef = doc(db, "availableSlots", slotId);
      const bookingRef = doc(db, "bookedSlots", slotId);
      logBookingDebug("log", "transaction_read_start", {
        referenceId: id,
        attempt: transactionAttempt,
        collection: "availableSlots",
        documentId: slotId,
      });
      logBookingDebug("log", "transaction_read_start", {
        referenceId: id,
        attempt: transactionAttempt,
        collection: "bookedSlots",
        documentId: slotId,
      });
      const [availability, booking] = await Promise.all([
        transaction.get(availabilityRef),
        transaction.get(bookingRef),
      ]);
      logBookingDebug("log", "transaction_read_complete", {
        referenceId: id,
        attempt: transactionAttempt,
        collection: "availableSlots",
        documentId: slotId,
        exists: availability.exists(),
        enabled: availability.exists() ? availability.data()["enabled"] === true : false,
      });
      logBookingDebug("log", "transaction_read_complete", {
        referenceId: id,
        attempt: transactionAttempt,
        collection: "bookedSlots",
        documentId: slotId,
        exists: booking.exists(),
      });
      if (!availability.exists() || !availability.data()["enabled"]) {
        throw new Error("This time is no longer available. Please choose another slot.");
      }
      if (booking.exists()) throw new Error("This time was just booked. Please choose another slot.");

      logBookingDebug("log", "transaction_write_queued", {
        referenceId: id,
        attempt: transactionAttempt,
        collection: "consultations",
        documentId: id,
      });
      transaction.set(doc(collection(db, "consultations"), id), {
        consultationId: id,
        fullName: data.fullName,
        whatsappNumber: `${data.countryCode}${data.phone}`,
        email: data.email.toLowerCase(),
        dateOfBirth: data.dateOfBirth,
        timeOfBirth: data.timeOfBirth ?? "",
        placeOfBirth: data.placeOfBirth,
        consultationType: data.consultationType,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        additionalMessage: data.additionalMessage,
        source: "website",
        status: "New",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId,
        customerId: userId,
        ...member,
      });
      logBookingDebug("log", "transaction_write_queued", {
        referenceId: id,
        attempt: transactionAttempt,
        collection: "bookedSlots",
        documentId: slotId,
      });
      transaction.set(bookingRef, { date: data.preferredDate, time: data.preferredTime, consultationId: id });
    });
  } catch (error) {
    logBookingDebug("error", "transaction_failed", {
      referenceId: id,
      slotId,
      attempts: transactionAttempt,
      ...bookingErrorDetails(error),
    });
    throw error;
  }
  logBookingDebug("log", "transaction_commit_success", { referenceId: id, slotId, attempts: transactionAttempt });
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ f: fingerprint, t: Date.now(), id }));
  } catch (error) {
    logBookingDebug("warn", "duplicate_guard_persist_failed_after_commit", {
      referenceId: id,
      ...bookingErrorDetails(error),
    });
  }
  return id;
}

export function formatDate(v?: string) {
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00`);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(v?: string) {
  if (!v) return "—";
  const [h, m] = v.split(":").map(Number);
  if (h === undefined || m === undefined || isNaN(h)) return v;
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
