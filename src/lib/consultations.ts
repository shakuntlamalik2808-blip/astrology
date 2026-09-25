import type { Timestamp } from "firebase/firestore";
import { z } from "zod";

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
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  dateOfBirth: z.string().min(1, "Please enter your date of birth."),
  timeOfBirth: z.string().optional().default(""),
  placeOfBirth: z.string().transform(clean).pipe(z.string().min(2, "Please enter your place of birth.").max(120)),
  currentCity: z.string().transform(clean).pipe(z.string().min(2, "Please enter your current city.").max(120)),
  consultationType: z.enum(CONSULTATION_TYPES, { message: "Please choose a consultation type." }),
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
  currentCity: string;
  consultationType: string;
  preferredDate: string;
  preferredTime: string;
  additionalMessage: string;
  source: string;
  status: ConsultationStatus;
  notes?: string;
  archived?: boolean;
  customerId?: string;
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

const LAST_KEY = "ss_last_submission";

/** Writes the consultation. Customer linking + WhatsApp happen server-side (Cloud Function). */
export async function submitConsultation(data: ConsultationData): Promise<string> {
  const fingerprint = `${data.email}|${data.phone}|${data.consultationType}|${data.preferredDate}`;
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as { f: string; t: number; id: string } | null;
    if (last && last.f === fingerprint && Date.now() - last.t < 2 * 60 * 1000) return last.id;
  } catch {
    /* ignore */
  }

  const id = makeConsultationId();
  const [{ collection, doc, serverTimestamp, setDoc }, { getFirebaseDb }] = await Promise.all([
    import("firebase/firestore"),
    import("./firebase"),
  ]);
  const db = getFirebaseDb();
  await setDoc(doc(collection(db, "consultations"), id), {
    consultationId: id,
    fullName: data.fullName,
    whatsappNumber: `${data.countryCode}${data.phone}`,
    email: data.email.toLowerCase(),
    dateOfBirth: data.dateOfBirth,
    timeOfBirth: data.timeOfBirth ?? "",
    placeOfBirth: data.placeOfBirth,
    currentCity: data.currentCity,
    consultationType: data.consultationType,
    preferredDate: data.preferredDate,
    preferredTime: data.preferredTime,
    additionalMessage: data.additionalMessage,
    source: "website",
    status: "New",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  localStorage.setItem(LAST_KEY, JSON.stringify({ f: fingerprint, t: Date.now(), id }));
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
