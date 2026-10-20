import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { collection, deleteField, doc, getDoc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { Copy, LoaderCircle, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import { useConsultations } from "@/lib/admin-data";
import { getFirebaseApp, getFirebaseDb } from "@/lib/firebase";
import {
  CONSULTATION_TYPES,
  COUNTRY_CODES,
  calculateBirthdayValidity,
  PAYMENT_STATUSES,
  STATUSES,
  consultationSchema,
  formatDate,
  formatTime,
  makeConsultationId,
  normalizeConsultationStatus,
  type Consultation,
  type CanonicalConsultationStatus,
  type ConsultationInput,
  type PaymentStatus,
  bookingSlotId,
} from "@/lib/consultations";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { Mic, MicOff, Download, Mail } from "lucide-react";

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
  validateSearch: z.object({ status: z.string().optional(), consultationId: z.string().optional() }),
  component: ConsultationsPage,
});

type Row = Consultation & { id: string };
type SortKey = "createdAt" | "preferredDate" | "fullName";
type QuickFilter = "Current" | "All" | CanonicalConsultationStatus;
type AdminForm = ConsultationInput & {
  status: CanonicalConsultationStatus;
  notes: string;
  paymentStatus: PaymentStatus;
  paidAmount: string;
  paymentMethod: string;
  paymentReference: string;
  paymentDate: string;
};
type FormErrors = Partial<Record<keyof AdminForm, string>>;

const emptyForm: AdminForm = {
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
  status: "New",
  notes: "",
  paymentStatus: "Unpaid",
  paidAmount: "",
  paymentMethod: "",
  paymentReference: "",
  paymentDate: "",
};

const adminSchema = consultationSchema.extend({
  status: z.enum(STATUSES),
  notes: z.string().max(3000, "Please keep notes under 3000 characters."),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paidAmount: z.coerce.number().finite().min(0, "Amount cannot be negative.").max(10000000, "Amount is too large."),
  paymentMethod: z.enum(["", "PhonePe", "Cash", "UPI", "Bank transfer", "Other"]),
  paymentReference: z.string().max(120, "Please keep the payment reference under 120 characters."),
  paymentDate: z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid payment date."),
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
    consultationType: row.consultationType as AdminForm["consultationType"],
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime,
    additionalMessage: row.additionalMessage,
    status: normalizeConsultationStatus(row.status, row.archived),
    notes: row.notes ?? "",
    paymentStatus: row.paymentStatus ?? "Unpaid",
    paidAmount: row.paidAmount === undefined ? "" : String(row.paidAmount),
    paymentMethod: row.paymentMethod ?? "",
    paymentReference: row.paymentReference ?? "",
    paymentDate: row.paymentDate ?? "",
  };
}

function displayStatus(row: Row) {
  return normalizeConsultationStatus(row.status, row.archived);
}

function isPhonePeGatewayPayment(row: Row) {
  return Boolean(row.phonePeTransactionId);
}

async function changeCancellation(row: Row, cancel: boolean) {
  const db = getFirebaseDb();
  const consultationRef = doc(db, "consultations", row.id);
  const slotRef = doc(db, "bookedSlots", bookingSlotId(row.preferredDate, row.preferredTime));
  await runTransaction(db, async (transaction) => {
    const slot = await transaction.get(slotRef);
    const slotData = slot.data();
    const slotConsultationId = slotData?.consultationId;
    const belongsToRow = !slotConsultationId || slotConsultationId === row.id || slotConsultationId === row.consultationId;
    if (cancel) {
      transaction.update(consultationRef, {
        status: "Cancelled",
        archived: true,
        statusBeforeCancel: row.statusBeforeCancel || (normalizeConsultationStatus(row.status, row.archived) === "Cancelled" ? "New" : normalizeConsultationStatus(row.status, row.archived)),
        completedAt: deleteField(),
        updatedAt: serverTimestamp(),
      });
      if (slot.exists() && belongsToRow) transaction.delete(slotRef);
      return;
    }
    if (slot.exists() && !belongsToRow) throw new Error("This slot has since been booked by another consultation. Choose a new slot before restoring this consultation.");
    const restoredStatus = normalizeConsultationStatus(row.statusBeforeCancel || "New") === "Active" ? "Active" : "New";
    transaction.update(consultationRef, {
      status: restoredStatus,
      archived: false,
      statusBeforeCancel: deleteField(),
      startedAt: restoredStatus === "Active" ? serverTimestamp() : deleteField(),
      completedAt: deleteField(),
      updatedAt: serverTimestamp(),
    });
    transaction.set(slotRef, { date: row.preferredDate, time: row.preferredTime, consultationId: row.consultationId });
  });
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function normalizedServiceName(value: string) {
  return value.toLowerCase().replace(/\b(single|consultation)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

async function consultationFee(row: Row) {
  const storedAmount = Number(row.paymentAmount);
  if (Number.isFinite(storedAmount) && storedAmount > 0) return storedAmount;

  const settings = await getDoc(doc(getFirebaseDb(), "settings", "website"));
  const services = settings.data()?.services;
  if (!Array.isArray(services)) throw new Error("Set this consultation's fee in Website Settings before marking it paid.");
  const target = normalizedServiceName(row.consultationType);
  const service = services.find((item) => normalizedServiceName(String(item.name ?? "")) === target)
    ?? services.find((item) => {
      const name = normalizedServiceName(String(item.name ?? ""));
      return name && target && (name.includes(target) || target.includes(name));
    });
  const amount = Number(String(service?.price ?? "").replace(/,/g, "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Could not find this consultation's full fee. Add a matching service price in Website Settings.");
  }
  return amount;
}

function ConsultationsPage() {
  const search = Route.useSearch();
  const { rows, error } = useConsultations();
  const autoOpenedConsultationId = useRef<string | null>(null);
  const [q, setQ] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() => {
    // The dashboard's New consultations link passes status=New; open that
    // landing view with both current stages selected by default.
    if (!search.status || search.status === "New") return "Current";
    if (search.status === "All") return "All";
    if (["New", "Active", "Done", "Cancelled", "Contacted", "Confirmed", "Completed", "Follow-up Required", "Payment Review"].includes(search.status)) {
      return normalizeConsultationStatus(search.status);
    }
    return "Current";
  });
  const [type, setType] = useState("All");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [viewing, setViewing] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [completionRow, setCompletionRow] = useState<Row | null>(null);
  const [paymentEntry, setPaymentEntry] = useState<{ row: Row; fee: number; amount: string; markDone: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => {
        const status = normalizeConsultationStatus(row.status, row.archived);
        if (quickFilter === "Current") return status === "New" || status === "Active";
        if (quickFilter === "All") return status !== "Cancelled";
        return status === quickFilter;
      })
      .filter((row) => type === "All" || row.consultationType === type)
      .filter((row) => !term || [row.fullName, row.email, row.whatsappNumber, row.consultationId, row.phonePeTransactionId].some((value) => value?.toLowerCase().includes(term)))
      .sort((a, b) => {
        if (sort === "fullName") return a.fullName.localeCompare(b.fullName);
        if (sort === "preferredDate") return (a.preferredDate + a.preferredTime).localeCompare(b.preferredDate + b.preferredTime);
        return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
      });
  }, [rows, q, quickFilter, type, sort]);

  useEffect(() => {
    if (!search.consultationId || !rows || autoOpenedConsultationId.current === search.consultationId) return;
    const target = rows.find((row) => row.id === search.consultationId || row.consultationId === search.consultationId);
    if (target) {
      autoOpenedConsultationId.current = search.consultationId;
      setViewing(target);
    }
  }, [search.consultationId, rows]);

  async function markStatus(row: Row, nextStatus: "Active" | "Done") {
    if (nextStatus === "Done" && row.paymentStatus !== "Paid") {
      setCompletionRow(row);
      return;
    }
    const action = `${row.id}:${nextStatus}`;
    setPendingAction(action);
    setActionNotice("");
    try {
      await updateDoc(doc(getFirebaseDb(), "consultations", row.id), {
        status: nextStatus,
        archived: false,
        statusBeforeCancel: deleteField(),
        startedAt: row.startedAt ?? serverTimestamp(),
        completedAt: nextStatus === "Done" ? serverTimestamp() : deleteField(),
        updatedAt: serverTimestamp(),
      });
      setActionNotice(nextStatus === "Done" ? "Consultation marked as Done." : "Consultation moved to Active.");
    } catch (cause) {
      setActionNotice((cause as Error).message || "Could not update consultation status.");
    } finally {
      setPendingAction(null);
    }
  }

  async function openPaymentEntry(row: Row, markDone: boolean) {
    setPendingAction(`${row.id}:fee`);
    setActionNotice("");
    let expectedFee: number;
    try {
      expectedFee = await consultationFee(row);
    } catch (cause) {
      setActionNotice((cause as Error).message || "Could not determine the consultation fee.");
      return;
    } finally {
      setPendingAction(null);
    }
    const defaultAmount = (row.paidAmount ?? 0) > 0 ? row.paidAmount ?? 0 : expectedFee;
    setCompletionRow(null);
    setPaymentEntry({ row, fee: expectedFee, amount: String(defaultAmount), markDone });
  }

  async function savePaymentEntry() {
    if (!paymentEntry) return;
    const { row, fee, markDone } = paymentEntry;
    const amountReceived = Number(paymentEntry.amount.trim());
    if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
      setActionNotice("Enter a valid amount greater than ₹0.");
      return;
    }
    setPendingAction(`${row.id}:${markDone ? "Done" : "paid"}`);
    setActionNotice("");
    try {
      await updateDoc(doc(getFirebaseDb(), "consultations", row.id), {
        ...(markDone ? {
          status: "Done",
          archived: false,
          statusBeforeCancel: deleteField(),
          startedAt: row.startedAt ?? serverTimestamp(),
          completedAt: serverTimestamp(),
        } : {}),
        paymentStatus: "Paid",
        paymentAmount: fee,
        paidAmount: amountReceived,
        paidAt: serverTimestamp(),
        paymentDate: todayInIndia(),
        updatedAt: serverTimestamp(),
      });
      setActionNotice(markDone ? "Payment recorded and consultation marked as Done." : "Payment recorded.");
      setPaymentEntry(null);
    } catch (cause) {
      setActionNotice((cause as Error).message || "Could not mark the consultation as paid and done.");
    } finally {
      setPendingAction(null);
    }
  }

  async function completeAndMarkPaid(row: Row) {
    await openPaymentEntry(row, true);
  }

  async function setCancelled(row: Row, cancel: boolean) {
    const action = `${row.id}:${cancel ? "cancel" : "restore"}`;
    setPendingAction(action);
    setActionNotice("");
    try {
      await changeCancellation(row, cancel);
      setActionNotice(cancel ? "Consultation cancelled and its reserved slot released." : "Consultation restored.");
    } catch (cause) {
      setActionNotice((cause as Error).message || "Could not update consultation cancellation.");
    } finally {
      setPendingAction(null);
    }
  }

  async function markPayment(row: Row, paid: boolean) {
    if (paid && normalizeConsultationStatus(row.status, row.archived) === "Cancelled") {
      setActionNotice("Restore this consultation before recording a payment.");
      return;
    }
    if (paid) {
      await openPaymentEntry(row, false);
      return;
    }
    if (!paid && isPhonePeGatewayPayment(row)) {
      setActionNotice("PhonePe gateway payments cannot be marked unpaid.");
      return;
    }
    if (!paid && !confirm(`Mark ${row.consultationId} as Unpaid? This clears the recorded amount and payment date.`)) return;
    const action = `${row.id}:${paid ? "paid" : "unpaid"}`;
    setPendingAction(action);
    setActionNotice("");
    try {
      const paymentFields = { paymentStatus: "Unpaid", paidAmount: 0, paidAt: deleteField(), paymentDate: "" };
      await updateDoc(doc(getFirebaseDb(), "consultations", row.id), {
        ...paymentFields,
        updatedAt: serverTimestamp(),
      });
      setActionNotice("Payment status reset to Unpaid.");
    } catch (cause) {
      setActionNotice((cause as Error).message || "Could not update payment status.");
    } finally {
      setPendingAction(null);
    }
  }

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
      {actionNotice && <p role="status" aria-live="polite" className="mt-4 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm">{actionNotice}</p>}
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Quick consultation filters">
        {([{ value: "Current", label: "New & Active" }, { value: "All", label: "All" }, ...STATUSES.map((status) => ({ value: status, label: status }))] as const).map(({ value, label }) => {
          const count = (rows ?? []).filter((row) => {
            const current = normalizeConsultationStatus(row.status, row.archived);
            if (value === "Current") return current === "New" || current === "Active";
            return value === "All" ? current !== "Cancelled" : current === value;
          }).length;
          return <button key={value} type="button" role="tab" aria-selected={quickFilter === value} onClick={() => setQuickFilter(value)} className={`min-h-10 rounded-sm border px-4 text-sm transition-colors ${quickFilter === value ? "border-gold bg-gold/15 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>{label}<span className="ml-2 text-xs opacity-70">{rows ? count : "…"}</span></button>;
        })}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_auto_auto_auto]">
        <input placeholder="Search name, email, phone, ID…" value={q} onChange={(event) => setQ(event.target.value)} className={`${control} sm:col-span-2 xl:col-span-1`} />
        <select value={type} onChange={(event) => setType(event.target.value)} className={control} aria-label="Type filter">
          <option>All</option>{CONSULTATION_TYPES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className={control} aria-label="Sort">
          <option value="createdAt">Newest first</option><option value="preferredDate">Preferred date</option><option value="fullName">Name A–Z</option>
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>{["Customer", "Consultation", "Preferred Date & Time", "Status", "Payment", "Quick actions"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((row) => (
              <tr key={row.id} tabIndex={0} onClick={() => setViewing(row)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setViewing(row); } }} className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold" title="Open consultation details">
                <td className="px-4 py-3"><p className="font-medium">{row.fullName}</p><p className="text-xs text-muted-foreground">{row.whatsappNumber}</p></td>
                <td className="px-4 py-3">{row.consultationType.replace(" Consultation", "")}</td>
                <td className="px-4 py-3"><span className="whitespace-nowrap">{formatDate(row.preferredDate)}</span><span className="ml-2 whitespace-nowrap text-muted-foreground">{formatTime(row.preferredTime)}</span></td>
                <td className="px-4 py-3"><StatusBadge status={displayStatus(row)} />{row.paymentReviewRequired && <p className="mt-1 text-xs font-medium text-amber-700">Payment review required</p>}</td>
                <td className="px-4 py-3"><PaymentBadge status={row.paymentStatus ?? "Unpaid"} amount={row.paidAmount ?? 0} />{row.paymentAmount ? <span className="mt-1 block text-xs text-muted-foreground">Fee: INR {row.paymentAmount}</span> : <span className="mt-1 block text-xs text-muted-foreground">Fee not set</span>}{row.phonePeTransactionId && <p className="mt-1 max-w-44 truncate text-xs text-muted-foreground" title={row.phonePeTransactionId}>PhonePe: {row.phonePeTransactionId}</p>}</td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-10" onClick={() => setViewing(row)}>View</Button>
                    {normalizeConsultationStatus(row.status, row.archived) === "New" && <Button type="button" className="h-10" disabled={pendingAction !== null} onClick={() => void markStatus(row, "Active")}>{pendingAction === `${row.id}:Active` ? <LoaderCircle className="animate-spin" /> : "Move to Active"}</Button>}
                    {normalizeConsultationStatus(row.status, row.archived) === "Active" && <Button type="button" className="h-10" disabled={pendingAction !== null} onClick={() => void markStatus(row, "Done")}>{pendingAction === `${row.id}:Done` ? <LoaderCircle className="animate-spin" /> : "Mark Done"}</Button>}
                    {normalizeConsultationStatus(row.status, row.archived) === "Done" && <span className="inline-flex h-10 items-center rounded-sm border border-border px-3 text-sm">Done ✓</span>}
                    {normalizeConsultationStatus(row.status, row.archived) === "Cancelled"
                      ? <Button type="button" variant="outline" className="h-10" disabled={pendingAction !== null} onClick={() => void setCancelled(row, false)}>{pendingAction === `${row.id}:restore` ? <LoaderCircle className="animate-spin" /> : "Restore to New/Active"}</Button>
                      : normalizeConsultationStatus(row.status, row.archived) === "New" && <Button type="button" variant="outline" className="h-10" disabled={pendingAction !== null} onClick={() => { if (confirm(`Cancel consultation ${row.consultationId} and release its reserved slot?`)) void setCancelled(row, true); }}>Cancel Consultation</Button>}
                    {row.paymentStatus === "Paid" ? (isPhonePeGatewayPayment(row) || normalizeConsultationStatus(row.status, row.archived) === "Cancelled" ? null : <Button type="button" variant="outline" className="h-10" disabled={pendingAction !== null} onClick={() => void markPayment(row, false)}>{pendingAction === `${row.id}:unpaid` ? <LoaderCircle className="animate-spin" /> : "Mark Unpaid"}</Button>) : normalizeConsultationStatus(row.status, row.archived) !== "Cancelled" && <Button type="button" variant="outline" className="h-10" disabled={pendingAction !== null} onClick={() => void markPayment(row, true)}>{pendingAction === `${row.id}:paid` || pendingAction === `${row.id}:fee` ? <LoaderCircle className="animate-spin" /> : "Mark Paid"}</Button>}
                  </div>
                </td>
              </tr>
            ))}
            {rows && list.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No matching consultations.</td></tr>}
            {!rows && !error && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-h-[90vh] sm:max-w-3xl sm:p-6">
          <ConsultationForm mode="create" initial={emptyForm} onClose={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-h-[90vh] sm:max-w-3xl sm:p-6">
          {editing && <ConsultationForm key={editing.id} mode="edit" initial={rowToForm(editing)} row={editing} onClose={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(viewing)} onOpenChange={(value) => !value && setViewing(null)}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-h-[90vh] sm:max-w-4xl sm:p-6">
          {viewing && <ConsultationView
            key={viewing.id}
            row={rows?.find((row) => row.id === viewing.id) ?? viewing}
            pendingAction={pendingAction}
            notice={actionNotice}
            onClose={() => setViewing(null)}
            onEdit={() => { setEditing(rows?.find((row) => row.id === viewing.id) ?? viewing); setViewing(null); }}
            onMarkStatus={(nextStatus) => void markStatus(rows?.find((row) => row.id === viewing.id) ?? viewing, nextStatus)}
            onMarkPayment={(paid) => void markPayment(rows?.find((row) => row.id === viewing.id) ?? viewing, paid)}
            onSetCancelled={(cancel) => { const row = rows?.find((item) => item.id === viewing.id) ?? viewing; if (cancel && !confirm(`Cancel consultation ${row.consultationId} and release its reserved slot?`)) return; void setCancelled(row, cancel); }}
          />}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(completionRow)} onOpenChange={(open) => !open && setCompletionRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Record payment to finish</DialogTitle><p className="text-sm text-muted-foreground">{completionRow?.consultationId} can be marked Done after its payment is recorded.</p></DialogHeader>
          <div className="mt-4 grid gap-3">
            {completionRow && <Button type="button" className="min-h-11" disabled={pendingAction !== null} onClick={() => void completeAndMarkPaid(completionRow)}>{pendingAction === `${completionRow.id}:Done` || pendingAction === `${completionRow.id}:fee` ? <LoaderCircle className="animate-spin" /> : "Mark Paid & Done"}</Button>}
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setCompletionRow(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(paymentEntry)} onOpenChange={(open) => !open && pendingAction === null && setPaymentEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Record payment received</DialogTitle>
            <p className="text-sm text-muted-foreground">{paymentEntry?.row.consultationId} · Consultation fee ₹{Number(paymentEntry?.fee ?? 0).toLocaleString("en-IN")}</p>
          </DialogHeader>
          <label className="mt-4 grid gap-2 text-sm">Amount received (₹)
            <input autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" value={paymentEntry?.amount ?? ""} onChange={(event) => setPaymentEntry((current) => current ? { ...current, amount: event.target.value } : current)} className={control} />
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" className="min-h-10" disabled={pendingAction !== null} onClick={() => setPaymentEntry(null)}>Cancel</Button>
            <Button type="button" className="min-h-10" disabled={pendingAction !== null} onClick={() => void savePaymentEntry()}>{pendingAction ? <LoaderCircle className="animate-spin" /> : paymentEntry?.markDone ? "Mark Paid & Done" : "Save Payment"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsultationView({
  row, pendingAction, notice, onClose, onEdit, onMarkStatus, onMarkPayment, onSetCancelled,
}: {
  row: Row;
  pendingAction: string | null;
  notice: string;
  onClose: () => void;
  onEdit: () => void;
  onMarkStatus: (status: "Active" | "Done") => void;
  onMarkPayment: (paid: boolean) => void;
  onSetCancelled: (cancel: boolean) => void;
}) {
  const phone = row.whatsappNumber || "";
  const phoneDigits = phone.replace(/\D/g, "");
  const [copyNotice, setCopyNotice] = useState("");

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice(`${label} copied.`);
    } catch {
      setCopyNotice("Clipboard access is unavailable in this browser.");
    }
  }

  return <div className="space-y-6">
    <DialogHeader className="pr-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <DialogTitle className="font-display text-xl">View Consultation</DialogTitle>
          <p className="mt-2 text-xs text-muted-foreground">{row.consultationId} · {row.source}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-10" onClick={onEdit}><Pencil className="mr-2 size-4" />Edit Details</Button>
          {normalizeConsultationStatus(row.status, row.archived) === "New" && <Button type="button" className="min-h-10" disabled={pendingAction !== null} onClick={() => onMarkStatus("Active")}>{pendingAction === `${row.id}:Active` ? <LoaderCircle className="animate-spin" /> : "Move to Active"}</Button>}
          {normalizeConsultationStatus(row.status, row.archived) === "Active" && <Button type="button" className="min-h-10" disabled={pendingAction !== null} onClick={() => onMarkStatus("Done")}>{pendingAction === `${row.id}:Done` ? <LoaderCircle className="animate-spin" /> : "Mark Done"}</Button>}
          {normalizeConsultationStatus(row.status, row.archived) === "Done" && <><span className="inline-flex min-h-10 items-center rounded-sm border border-border px-3 text-sm">Done ✓</span><Button type="button" variant="outline" className="min-h-10" disabled={pendingAction !== null} onClick={() => onMarkStatus("Active")}>Reopen to Active</Button></>}
          {normalizeConsultationStatus(row.status, row.archived) === "Cancelled"
            ? <Button type="button" variant="outline" className="min-h-10" disabled={pendingAction !== null} onClick={() => onSetCancelled(false)}>{pendingAction === `${row.id}:restore` ? <LoaderCircle className="animate-spin" /> : "Restore to New/Active"}</Button>
            : normalizeConsultationStatus(row.status, row.archived) === "New" && <Button type="button" variant="outline" className="min-h-10" disabled={pendingAction !== null} onClick={() => onSetCancelled(true)}>Cancel Consultation</Button>}
        </div>
      </div>
    </DialogHeader>

    {(notice || copyNotice) && <p role="status" aria-live="polite" className="rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm">{copyNotice || notice}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={displayStatus(row)} />
      <PaymentBadge status={row.paymentStatus ?? "Unpaid"} amount={row.paidAmount ?? 0} />
      {row.paymentStatus === "Paid"
        ? (isPhonePeGatewayPayment(row) || normalizeConsultationStatus(row.status, row.archived) === "Cancelled" ? null : <Button type="button" variant="outline" className="min-h-10" disabled={pendingAction !== null} onClick={() => onMarkPayment(false)}>{pendingAction === `${row.id}:unpaid` ? <LoaderCircle className="animate-spin" /> : "Mark Unpaid"}</Button>)
        : normalizeConsultationStatus(row.status, row.archived) !== "Cancelled" && <Button type="button" variant="outline" className="min-h-10" disabled={pendingAction !== null} onClick={() => onMarkPayment(true)}>{pendingAction === `${row.id}:paid` || pendingAction === `${row.id}:fee` ? <LoaderCircle className="animate-spin" /> : "Mark Paid"}</Button>}
      <span className="text-sm text-muted-foreground">Received {`₹${Number(row.paidAmount ?? 0).toLocaleString("en-IN")}`} {row.paymentAmount ? `of ₹${Number(row.paymentAmount).toLocaleString("en-IN")}` : ""}</span>
    </div>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Consultation details">
      <ReadOnlyCard label="Client name" value={row.fullName} />
      <ReadOnlyCard label="Member / relationship" value={`${row.memberName || row.fullName} · ${row.relationship || "Self"}`} />
      <div className="rounded-sm border border-border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p><a className="mt-2 block break-all font-medium underline underline-offset-4" href={`tel:${phone}`}>{phone || "Not provided"}</a><div className="mt-3 flex flex-wrap gap-2"><a className="inline-flex min-h-9 items-center rounded-sm border border-border px-3 text-xs" href={`tel:${phone}`}>Call</a>{phoneDigits && <a className="inline-flex min-h-9 items-center rounded-sm border border-border px-3 text-xs" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">WhatsApp</a>}</div></div>
      <ReadOnlyCard label="Email" value={row.email || "Not provided"} href={row.email ? `mailto:${row.email}` : undefined} />
      <ReadOnlyCard label="Consultation type" value={row.consultationType} />
      <ReadOnlyCard label="Appointment" value={`${formatDate(row.preferredDate)} · ${formatTime(row.preferredTime)}`} />
      <ReadOnlyCard label="Validity" value={formatDate(row.validUntil)} />
      <ReadOnlyCard label="Payment method / reference" value={[row.paymentMethod, row.paymentReference].filter(Boolean).join(" · ") || "Not recorded"} />
      {row.paymentReviewRequired && <ReadOnlyCard label="Payment review" value="Payment verified, but the booked slot conflicted. Contact the customer to reschedule or refund." />}
    </section>

    <section className="rounded-sm border border-gold/50 bg-gold/5 p-4 sm:p-5" aria-label="Birth details">
      <h3 className="font-display text-lg">Birth details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CopyField label="Date of birth" value={formatDate(row.dateOfBirth)} onCopy={() => void copy("Date of birth", row.dateOfBirth)} />
        <CopyField label="Time of birth" value={row.timeOfBirth || "Not provided"} onCopy={() => void copy("Time of birth", row.timeOfBirth || "")} />
        <CopyField label="Place of birth" value={row.placeOfBirth || "Not provided"} onCopy={() => void copy("Place of birth", row.placeOfBirth || "")} />
      </div>
    </section>

    {row.additionalMessage && <ReadOnlyCard label="Client message" value={row.additionalMessage} />}
    {row.phonePeTransactionId && <ReadOnlyCard label="PhonePe transaction ID" value={row.phonePeTransactionId} />}
    <RemediesEditor row={row} />
    <div className="flex justify-end border-t border-border pt-4"><Button type="button" variant="outline" className="min-h-10" onClick={onClose}>Close</Button></div>
  </div>;
}

function ReadOnlyCard({ label, value, href }: { label: string; value: string; href?: string }) {
  return <div className="min-w-0 rounded-sm border border-border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>{href ? <a href={href} className="mt-2 block break-words font-medium underline underline-offset-4">{value}</a> : <p className="mt-2 break-words font-medium">{value || "—"}</p>}</div>;
}

function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return <div className="min-w-0 rounded-sm border border-gold/30 bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-2 flex items-center justify-between gap-2"><p className="break-words text-sm font-medium">{value || "—"}</p><Button type="button" variant="outline" className="h-9 shrink-0 px-2" aria-label={`Copy ${label}`} onClick={onCopy}><Copy className="mr-1 size-3.5" />Copy</Button></div></div>;
}

function PaymentBadge({ status, amount }: { status: PaymentStatus; amount: number }) {
  const style = status === "Paid" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : status === "Partially paid" ? "border-rose-500/40 bg-rose-500/10 text-rose-800" : "border-amber-500/40 bg-amber-500/10 text-amber-800";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}><span>{status}</span>{amount > 0 && <span>· ₹{amount.toLocaleString("en-IN")}</span>}</span>;
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
          memberId: row?.memberId || "self",
          memberName: row?.memberName || data.fullName,
          relationship: row?.relationship || "Self",
          ...calculateBirthdayValidity(data.dateOfBirth, data.preferredDate),
      consultationType: data.consultationType,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      additionalMessage: data.additionalMessage,
      status: data.status,
      notes: data.notes.trim(),
      paymentStatus: data.paymentStatus,
      paidAmount: data.paidAmount,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference.trim(),
      paymentDate: data.paymentDate,
      archived: data.status === "Cancelled",
      updatedAt: serverTimestamp(),
    };

    try {
      if (mode === "create") {
        if (data.status === "Done" && data.paymentStatus !== "Paid") throw new Error("Mark payment as Paid before creating a consultation as Done.");
        const id = makeConsultationId();
        const db = getFirebaseDb();
        const consultationRef = doc(collection(db, "consultations"), id);
        const slotRef = doc(db, "bookedSlots", bookingSlotId(data.preferredDate, data.preferredTime));
        await runTransaction(db, async (transaction) => {
          const slot = data.status === "Cancelled" ? null : await transaction.get(slotRef);
          if (slot?.exists()) throw new Error("This time is already reserved. Choose a different slot.");
          transaction.set(consultationRef, {
            ...payload,
            ...(data.status === "Cancelled" ? { statusBeforeCancel: "New" } : {}),
            ...(data.status === "Active" || data.status === "Done" ? { startedAt: serverTimestamp() } : {}),
            ...(data.status === "Done" ? { completedAt: serverTimestamp() } : {}),
            consultationId: id,
            source: "admin",
            createdAt: serverTimestamp(),
          });
          if (data.status !== "Cancelled") transaction.set(slotRef, { date: data.preferredDate, time: data.preferredTime, consultationId: id });
        });
      } else if (row) {
        const db = getFirebaseDb();
        const oldSlotId = bookingSlotId(row.preferredDate, row.preferredTime);
        const newSlotId = bookingSlotId(data.preferredDate, data.preferredTime);
        const oldSlotRef = doc(db, "bookedSlots", oldSlotId);
        const newSlotRef = doc(db, "bookedSlots", newSlotId);
        const wasCancelled = normalizeConsultationStatus(row.status, row.archived) === "Cancelled";
        const nextStatusBeforeCancel = data.status === "Cancelled"
          ? (row.statusBeforeCancel || (wasCancelled ? "New" : normalizeConsultationStatus(row.status, row.archived)))
          : deleteField();
        if (data.status === "Done" && data.paymentStatus !== "Paid") throw new Error("Use the Mark Done action and choose whether to record payment or keep it unpaid.");
        await runTransaction(db, async (transaction) => {
          const oldSlot = await transaction.get(oldSlotRef);
          const newSlot = newSlotId === oldSlotId ? oldSlot : (data.status === "Cancelled" ? null : await transaction.get(newSlotRef));
          const newSlotOwner = newSlot?.data()?.consultationId;
          if (data.status !== "Cancelled" && newSlot?.exists() && newSlotOwner && newSlotOwner !== row.id && newSlotOwner !== row.consultationId) {
            throw new Error("This time is already reserved. Choose a different slot.");
          }
          transaction.update(doc(db, "consultations", row.id), {
            ...payload,
            statusBeforeCancel: nextStatusBeforeCancel,
            startedAt: data.status === "Active" ? row.startedAt ?? serverTimestamp() : deleteField(),
            completedAt: data.status === "Done" ? row.completedAt ?? serverTimestamp() : deleteField(),
          });
          const oldSlotOwner = oldSlot.data()?.consultationId;
          const oldSlotBelongsHere = !oldSlotOwner || oldSlotOwner === row.id || oldSlotOwner === row.consultationId;
          if ((oldSlotId !== newSlotId || data.status === "Cancelled") && oldSlot.exists() && oldSlotBelongsHere) transaction.delete(oldSlotRef);
          if (data.status !== "Cancelled") transaction.set(newSlotRef, { date: data.preferredDate, time: data.preferredTime, consultationId: row.consultationId });
        });
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
      const db = getFirebaseDb();
      const consultationRef = doc(db, "consultations", row.id);
      const slotRef = doc(db, "bookedSlots", bookingSlotId(row.preferredDate, row.preferredTime));
      await runTransaction(db, async (transaction) => {
        const slot = await transaction.get(slotRef);
        const slotOwner = slot.data()?.consultationId;
        transaction.delete(consultationRef);
        if (slot.exists() && (!slotOwner || slotOwner === row.id || slotOwner === row.consultationId)) transaction.delete(slotRef);
      });
      onClose();
    } catch (cause) {
      setError((cause as Error).message || "Could not delete this consultation.");
      setBusy(false);
    }
  }

  async function toggleCancellation() {
    if (!row) return;
    const cancelling = normalizeConsultationStatus(row.status, row.archived) !== "Cancelled";
    if (cancelling && !confirm(`Cancel consultation ${row.consultationId} and release its reserved slot?`)) return;
    setBusy(true);
    setError(null);
    try {
      await changeCancellation(row, cancelling);
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
        <p className="text-xs text-muted-foreground">{mode === "create" ? "Record a phone or in-person booking." : `${row?.consultationId} · ${row?.source}`}</p>
      </DialogHeader>

      <div className="mt-6 space-y-7">
        <FormSection title="Client details">
          <FormField label="Full name" error={errors.fullName} full><input value={form.fullName} onChange={(event) => set("fullName")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Phone number" error={errors.phone}>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
              <select aria-label="Country code" value={form.countryCode} onChange={(event) => set("countryCode")(event.target.value)} className={inputClass}>{COUNTRY_CODES.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select>
              <input type="tel" inputMode="numeric" value={form.phone} onChange={(event) => set("phone")(event.target.value)} className={inputClass} />
            </div>
          </FormField>
          <FormField label="Date of birth" error={errors.dateOfBirth}><input type="date" value={form.dateOfBirth} onChange={(event) => set("dateOfBirth")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Time of birth"><input type="time" value={form.timeOfBirth} onChange={(event) => set("timeOfBirth")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Place of birth" error={errors.placeOfBirth}><input value={form.placeOfBirth} onChange={(event) => set("placeOfBirth")(event.target.value)} className={inputClass} /></FormField>
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

        <FormSection title="Payment tracking">
          <FormField label="Payment status" error={errors.paymentStatus}><select value={form.paymentStatus} onChange={(event) => set("paymentStatus")(event.target.value)} className={inputClass}>{PAYMENT_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></FormField>
          <FormField label="Amount received (₹)" error={errors.paidAmount}><input type="number" min="0" step="0.01" inputMode="decimal" value={form.paidAmount} onChange={(event) => set("paidAmount")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Payment method" error={errors.paymentMethod}><select value={form.paymentMethod} onChange={(event) => set("paymentMethod")(event.target.value)} className={inputClass}><option value="">Not recorded</option><option>PhonePe</option><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Other</option></select></FormField>
          <FormField label="Payment date" error={errors.paymentDate}><input type="date" value={form.paymentDate} onChange={(event) => set("paymentDate")(event.target.value)} className={inputClass} /></FormField>
          <FormField label="Payment reference" error={errors.paymentReference} full><input placeholder="Optional transaction ID or receipt number" value={form.paymentReference} onChange={(event) => set("paymentReference")(event.target.value)} className={inputClass} /></FormField>
          {row?.phonePeTransactionId && <FormField label="PhonePe transaction ID" full><input value={row.phonePeTransactionId} readOnly className={`${inputClass} opacity-75`} /></FormField>}
        </FormSection>
      </div>

      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
        {mode === "edit" ? (
          <div className="grid grid-cols-2 gap-2">
            {row && normalizeConsultationStatus(row.status, row.archived) !== "Cancelled" && normalizeConsultationStatus(row.status, row.archived) !== "New" ? <span /> : <Button type="button" variant="outline" disabled={busy} onClick={toggleCancellation}>{row && normalizeConsultationStatus(row.status, row.archived) === "Cancelled" ? "Restore Consultation" : "Cancel Consultation"}</Button>}
            <Button type="button" variant="outline" disabled={busy} onClick={remove} className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">Delete</Button>
          </div>
        ) : <span />}
        <Button type="submit" disabled={busy} className="h-10 rounded-sm">{busy ? "Saving…" : mode === "create" ? "Create consultation" : "Save changes"}</Button>
      </div>
    </form>
  );
}

type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; [index: number]: SpeechAlternative };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechRecognizer = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognizer; webkitSpeechRecognition?: new () => SpeechRecognizer };

function RemediesEditor({ row }: { row: Row }) {
  const [hindi, setHindi] = useState(row.remediesHindi ?? "");
  const [english, setEnglish] = useState(row.remediesEnglish ?? "");
  const [language, setLanguage] = useState<"Hindi" | "English">(row.remedyLanguage ?? "Hindi");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const recognition = useRef<SpeechRecognizer | null>(null);
  const selected = language === "Hindi" ? hindi : english;

  useEffect(() => () => recognition.current?.stop(), []);

  function toggleRecording() {
    if (recording) { recognition.current?.stop(); setRecording(false); setInterim(""); return; }
    const Constructor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) { setNotice("Hindi voice dictation is not supported in this browser. Try Chrome or type your notes."); return; }
    const speech = new Constructor();
    speech.lang = "hi-IN"; speech.continuous = true; speech.interimResults = true;
    speech.onresult = (event) => {
      let finalText = ""; let preview = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) finalText += result[0]?.transcript ?? "";
        else preview += result[0]?.transcript ?? "";
      }
      if (finalText.trim()) setHindi((current) => `${current}${current.trim() ? "\n" : ""}${finalText.trim()}`);
      setInterim(preview);
    };
    speech.onerror = () => { setNotice("Microphone dictation stopped. Check microphone permission and try again."); setRecording(false); };
    speech.onend = () => { setRecording(false); setInterim(""); };
    recognition.current = speech; setNotice(""); setRecording(true); speech.start();
  }

  async function saveDraft(fields: Record<string, unknown> = {}): Promise<boolean> {
    if (!row) return false;
    setBusy(true); setNotice("");
    try {
      await updateDoc(doc(getFirebaseDb(), "consultations", row.id), {
        remediesHindi: hindi, remediesEnglish: english, remedyLanguage: language,
        updatedAt: serverTimestamp(), ...fields,
      });
      setNotice("Remedies saved.");
      return true;
    } catch (cause) { setNotice((cause as Error).message || "Could not save remedies."); return false; }
    finally { setBusy(false); }
  }

  function preview() {
    const content = selected;
    const safe = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
    const remedyItems = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `<li>${safe(line)}</li>`).join("");
    const body = `<!doctype html><html lang="${language === "Hindi" ? "hi" : "en"}"><meta charset="utf-8"><title>Remedies — ${safe(row.consultationId)}</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600&family=Playfair+Display:wght@500;600&display=swap');body{font-family:'Noto Sans Devanagari',serif;color:#18202b;margin:0}.page{max-width:760px;margin:48px auto;padding:52px;border:1px solid #c6a96b}.brand{color:#a7833d;letter-spacing:.18em;text-transform:uppercase;font-size:12px}.title{font-family:'Playfair Display',serif;font-size:30px;margin:8px 0 26px}.meta{border-block:1px solid #ddd;padding:16px 0;line-height:1.8}.remedies{line-height:1.9;margin-top:24px;padding-left:1.5em}.remedies li{padding:0 0 10px 6px}.remedies li::marker{color:#a7833d}.footer{margin-top:42px;color:#777;font-size:12px}@media print{.page{margin:0 auto;border:0}}</style><main class="page"><div class="brand">Shakuntla Malik · Jyotish, Counseling & Astrology Academy</div><h1 class="title">${language === "Hindi" ? "ज्योतिषीय उपाय एवं मार्गदर्शन" : "Remedies & Guidance"}</h1><div class="meta"><b>Reference:</b> ${safe(row.consultationId)}<br><b>Client:</b> ${safe(row.memberName || row.fullName)}<br><b>Date:</b> ${safe(formatDate(row.preferredDate))}<br><b>Birth details:</b> ${safe([row.dateOfBirth, row.timeOfBirth, row.placeOfBirth].filter(Boolean).join(" · "))}<br><b>Valid until:</b> ${safe(formatDate(row.validUntil))}</div><ol class="remedies">${remedyItems}</ol><div class="footer">Prepared with care by Shakuntla Malik</div></main><script>window.onload=()=>document.fonts.ready.then(()=>window.print())</script></html>`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/html" }));
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function sendEmail() {
    if (!row.email) return;
    if (!await saveDraft()) return;
    setBusy(true); setNotice("");
    try {
      const callable = httpsCallable<{ consultationId: string }, { sent: boolean }>(getFunctions(getFirebaseApp(), "asia-south1"), "sendRemedyEmail");
      await callable({ consultationId: row.id });
      setNotice(`Remedy PDF emailed to ${row.email}.`);
    } catch (cause) { setNotice((cause as Error).message || "Email could not be sent."); }
    finally { setBusy(false); }
  }

  return <FormSection title="Remedies & Guidance (उपाय)">
    <div className="space-y-4 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggleRecording} className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-sm ${recording ? "bg-destructive text-white" : "border border-border bg-background"}`}>
          {recording ? <MicOff size={16} /> : <Mic size={16} />}{recording ? "Stop microphone" : "Start Hindi dictation"}
        </button>
        {recording && <span className="flex items-center gap-2 text-sm text-destructive"><span className="size-2 animate-pulse rounded-full bg-destructive" /> Recording in Hindi</span>}
        <label className="ml-auto flex items-center gap-2 text-sm">PDF language<select value={language} onChange={(event) => setLanguage(event.target.value as "Hindi" | "English")} className={inputClass}><option value="Hindi">Hindi (हिन्दी)</option><option value="English">English</option></select></label>
      </div>
      {language === "Hindi" ? <label className="block text-xs text-muted-foreground">Hindi remedies<textarea rows={7} lang="hi" value={hindi} onChange={(event) => setHindi(event.target.value)} className={`${inputClass} h-auto py-3`} placeholder="उपाय यहाँ लिखें या हिंदी में बोलें…" /></label> : <label className="block text-xs text-muted-foreground">English remedies draft<textarea rows={7} value={english} onChange={(event) => setEnglish(event.target.value)} className={`${inputClass} h-auto py-3`} placeholder="Review and edit the English version here…" /></label>}
      {recording && interim && <p aria-live="polite" className="rounded-sm border border-gold/40 bg-muted/40 p-3 text-sm text-muted-foreground">Listening: {interim}</p>}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void saveDraft()}>Save remedies</Button><Button type="button" variant="outline" disabled={busy || !selected.trim()} onClick={preview}><Download className="mr-2 size-4" />Preview / Download PDF</Button><Button type="button" disabled={busy || !row.email || !selected.trim()} onClick={() => void sendEmail()}><Mail className="mr-2 size-4" />Send Remedies PDF via Email</Button></div>
      {!row.email && <p className="text-xs text-muted-foreground">Add a customer email address to enable email delivery.</p>}
      {row.remediesSentAt && <p className="text-xs text-muted-foreground">Last sent: {row.remediesSentAt.toDate().toLocaleString("en-IN")}</p>}
      {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  </FormSection>;
}

const inputClass = "mt-1 h-10 w-full min-w-0 rounded-sm border border-input bg-background px-3 text-sm";

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <fieldset><legend className="mb-4 font-display text-lg">{title}</legend><div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}

function FormField({ label, error, full, children }: { label: string; error?: string | undefined; full?: boolean; children: ReactNode }) {
  return <label className={`text-xs text-muted-foreground ${full ? "sm:col-span-2" : ""}`}>{label}{children}{error && <span className="mt-1 block text-xs text-destructive">{error}</span>}</label>;
}
