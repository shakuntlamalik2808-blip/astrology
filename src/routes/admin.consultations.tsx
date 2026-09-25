import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { Plus } from "lucide-react";
import { z } from "zod";
import { useConsultations } from "@/lib/admin-data";
import { getFirebaseDb } from "@/lib/firebase";
import {
  CONSULTATION_TYPES,
  COUNTRY_CODES,
  STATUSES,
  consultationSchema,
  formatDate,
  formatTime,
  makeConsultationId,
  type Consultation,
  type ConsultationInput,
  type ConsultationStatus,
} from "@/lib/consultations";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/consultations")({
  head: () => ({
    meta: [
      { title: "Consultations — Studio" },
      { name: "description", content: "Manage consultation requests." },
      { property: "og:title", content: "Consultations — Studio" },
      { property: "og:description", content: "Manage consultation requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: z.object({ status: z.string().optional() }),
  component: ConsultationsPage,
});

type Row = Consultation & { id: string };
type SortKey = "createdAt" | "preferredDate" | "fullName";
type AdminForm = ConsultationInput & { status: ConsultationStatus; notes: string };
type FormErrors = Partial<Record<keyof AdminForm, string>>;

const emptyForm: AdminForm = {
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
  status: "New",
  notes: "",
};

const adminSchema = consultationSchema.extend({
  status: z.enum(STATUSES),
  notes: z.string().max(3000, "Please keep notes under 3000 characters."),
});

function splitPhone(whatsappNumber: string) {
  const match = [...COUNTRY_CODES]
    .sort((a, b) => b.code.length - a.code.length)
    .find(({ code }) => whatsappNumber.startsWith(code));
  return match
    ? { countryCode: match.code, phone: whatsappNumber.slice(match.code.length) }
    : { countryCode: "+91", phone: whatsappNumber.replace(/^\+/, "") };
}

function rowToForm(row: Row): AdminForm {
  return {
    fullName: row.fullName,
    ...splitPhone(row.whatsappNumber),
    email: row.email,
    dateOfBirth: row.dateOfBirth,
    timeOfBirth: row.timeOfBirth,
    placeOfBirth: row.placeOfBirth,
    currentCity: row.currentCity,
    consultationType: row.consultationType as AdminForm["consultationType"],
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime,
    additionalMessage: row.additionalMessage,
    status: row.status,
    notes: row.notes ?? "",
  };
}

function ConsultationsPage() {
  const search = Route.useSearch();
  const { rows, error } = useConsultations();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(search.status ?? "All");
  const [type, setType] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [open, setOpen] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => (showArchived ? row.archived : !row.archived))
      .filter((row) => status === "All" || row.status === status)
      .filter((row) => type === "All" || row.consultationType === type)
      .filter((row) => !term || [row.fullName, row.email, row.whatsappNumber, row.consultationId, row.currentCity].some((value) => value?.toLowerCase().includes(term)))
      .sort((a, b) => {
        if (sort === "fullName") return a.fullName.localeCompare(b.fullName);
        if (sort === "preferredDate") return (a.preferredDate + a.preferredTime).localeCompare(b.preferredDate + b.preferredTime);
        return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
      });
  }, [rows, q, status, type, showArchived, sort]);

  const control = "h-10 min-w-0 rounded-sm border border-input bg-card px-3 text-sm";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="display text-3xl">Consultations</h1>
          <p className="mt-2 text-sm text-muted-foreground">View website requests and record phone or in-person bookings.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="h-10 rounded-sm sm:self-start">
          <Plus /> New consultation
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_auto_auto_auto_auto]">
        <input placeholder="Search name, email, phone, ID…" value={q} onChange={(event) => setQ(event.target.value)} className={`${control} sm:col-span-2 xl:col-span-1`} />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className={control} aria-label="Status filter">
          <option>All</option>{STATUSES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value)} className={control} aria-label="Type filter">
          <option>All</option>{CONSULTATION_TYPES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className={control} aria-label="Sort">
          <option value="createdAt">Newest first</option><option value="preferredDate">Preferred date</option><option value="fullName">Name A–Z</option>
        </select>
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Archived</label>
      </div>

      <div className="mt-6 overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>{["Customer", "Consultation", "Preferred Date", "Preferred Time", "Status"].map((heading) => <th key={heading} className="px-5 py-3 font-medium">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((row) => (
              <tr key={row.id} onClick={() => setOpen(row)} className="cursor-pointer transition-colors hover:bg-muted/50">
                <td className="px-5 py-3"><p className="font-medium">{row.fullName}</p><p className="text-xs text-muted-foreground">{row.whatsappNumber}</p></td>
                <td className="px-5 py-3">{row.consultationType.replace(" Consultation", "")}</td>
                <td className="px-5 py-3">{formatDate(row.preferredDate)}</td>
                <td className="px-5 py-3">{formatTime(row.preferredTime)}</td>
                <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
              </tr>
            ))}
            {rows && list.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No matching consultations.</td></tr>}
            {!rows && !error && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-h-[90vh] sm:max-w-3xl sm:p-6">
          <ConsultationForm mode="create" initial={emptyForm} onClose={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(open)} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-h-[90vh] sm:max-w-3xl sm:p-6">
          {open && <ConsultationForm mode="edit" initial={rowToForm(open)} row={open} onClose={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsultationForm({ mode, initial, row, onClose }: { mode: "create" | "edit"; initial: AdminForm; row?: Row; onClose: () => void }) {
  const [form, setForm] = useState<AdminForm>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof AdminForm) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = adminSchema.safeParse({ ...form, phone: form.phone.replace(/[\s-]/g, "") });
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AdminForm;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    setBusy(true);
    setError(null);
    const data = parsed.data;
    const payload = {
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
      status: data.status,
      notes: data.notes.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (mode === "create") {
        const id = makeConsultationId();
        await setDoc(doc(collection(getFirebaseDb(), "consultations"), id), {
          ...payload,
          consultationId: id,
          source: "admin",
          archived: false,
          createdAt: serverTimestamp(),
        });
      } else if (row) {
        await updateDoc(doc(getFirebaseDb(), "consultations", row.id), payload);
      }
      onClose();
    } catch (cause) {
      setError((cause as Error).message || "Could not save this consultation.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!row || !confirm("Delete this consultation permanently?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDoc(doc(getFirebaseDb(), "consultations", row.id));
      onClose();
    } catch (cause) {
      setError((cause as Error).message || "Could not delete this consultation.");
      setBusy(false);
    }
  }

  async function toggleArchive() {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await updateDoc(doc(getFirebaseDb(), "consultations", row.id), { archived: !row.archived, updatedAt: serverTimestamp() });
      onClose();
    } catch (cause) {
      setError((cause as Error).message || "Could not update this consultation.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <DialogHeader>
        <DialogTitle className="font-display">{mode === "create" ? "New consultation" : `Edit ${row?.fullName ?? "consultation"}`}</DialogTitle>
        <p className="text-xs text-muted-foreground">{mode === "create" ? "Record a phone, WhatsApp, or in-person booking." : `${row?.consultationId} · ${row?.source}`}</p>
      </DialogHeader>

      <div className="mt-6 space-y-7">
        <FormSection title="Client details">
          <FormField label="Full name" error={errors.fullName} full><input value={form.fullName} onChange={(event) => set("fullName")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="WhatsApp number" error={errors.phone}>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <select aria-label="Country code" value={form.countryCode} onChange={(event) => set("countryCode")(event.target.value)} className={inputClass}>{COUNTRY_CODES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select>
              <input type="tel" inputMode="numeric" value={form.phone} onChange={(event) => set("phone")(event.target.value)} className={inputClass} />
            </div>
          </FormField>
          <FormField label="Date of birth" error={errors.dateOfBirth}><input type="date" value={form.dateOfBirth} onChange={(event) => set("dateOfBirth")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Time of birth"><input type="time" value={form.timeOfBirth} onChange={(event) => set("timeOfBirth")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Place of birth" error={errors.placeOfBirth}><input value={form.placeOfBirth} onChange={(event) => set("placeOfBirth")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Current city" error={errors.currentCity}><input value={form.currentCity} onChange={(event) => set("currentCity")(event.target.value)} className={inputClass} /></FormField>
        </FormSection>

        <FormSection title="Consultation details">
          <FormField label="Consultation" error={errors.consultationType}>
            <select value={form.consultationType} onChange={(event) => set("consultationType")(event.target.value)} className={inputClass}><option value="">Choose a consultation</option>{CONSULTATION_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
          </FormField>
          <FormField label="Status" error={errors.status}><select value={form.status} onChange={(event) => set("status")(event.target.value)} className={inputClass}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select></FormField>
          <FormField label="Preferred date" error={errors.preferredDate}><input type="date" value={form.preferredDate} onChange={(event) => set("preferredDate")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Preferred time" error={errors.preferredTime}><input type="time" value={form.preferredTime} onChange={(event) => set("preferredTime")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Client message" error={errors.additionalMessage} full><textarea rows={3} value={form.additionalMessage} onChange={(event) => set("additionalMessage")(event.target.value)} className={`${inputClass} h-auto py-2`} /></FormField>
          <FormField label="Internal notes" error={errors.notes} full><textarea rows={3} value={form.notes} onChange={(event) => set("notes")(event.target.value)} className={`${inputClass} h-auto py-2`} /></FormField>
        </FormSection>
      </div>

      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
        {mode === "edit" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={toggleArchive}>{row?.archived ? "Unarchive" : "Archive"}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={remove} className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">Delete</Button>
          </div>
        ) : <span />}
        <Button type="submit" disabled={busy} className="h-10 rounded-sm">{busy ? "Saving…" : mode === "create" ? "Create consultation" : "Save changes"}</Button>
      </div>
    </form>
  );
}

const inputClass = "mt-1 h-10 w-full min-w-0 rounded-sm border border-input bg-background px-3 text-sm";

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset><legend className="mb-4 font-display text-lg">{title}</legend><div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}

function FormField({ label, error, full, children }: { label: string; error?: string | undefined; full?: boolean; children: ReactNode }) {
  return <label className={`text-xs text-muted-foreground ${full ? "sm:col-span-2" : ""}`}>{label}{children}{error && <span className="mt-1 block text-xs text-destructive">{error}</span>}</label>;
}
