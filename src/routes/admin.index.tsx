import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { deleteField, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useConsultations, useNotifications } from "@/lib/admin-data";
import { formatDate, formatTime, normalizeConsultationStatus, type Consultation } from "@/lib/consultations";
import { getFirebaseDb } from "@/lib/firebase";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Studio" },
      { name: "description", content: "Consultation management dashboard." },
      { property: "og:title", content: "Dashboard — Studio" },
      { property: "og:description", content: "Consultation management dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = Route.useNavigate();
  const { rows, error } = useConsultations();
  const { rows: notes } = useNotifications();
  const [pendingCompletion, setPendingCompletion] = useState<(Consultation & { id: string }) | null>(null);
  const [paymentEntry, setPaymentEntry] = useState<{ row: Consultation & { id: string }; fee: number; amount: string; andDone: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const active = rows?.filter((r) => normalizeConsultationStatus(r.status, r.archived) !== "Cancelled") ?? [];
  const newCount = active.filter((r) => normalizeConsultationStatus(r.status, r.archived) === "New").length;
  const failed = notes?.filter((n) => n.status === "Failed").length ?? 0;

  async function consultationFee(row: Consultation) {
    if (Number(row.paymentAmount) > 0) return Number(row.paymentAmount);
    const snapshot = await getDoc(doc(getFirebaseDb(), "settings", "website"));
    const services = snapshot.data()?.services;
    const normalized = row.consultationType.toLowerCase().replace(/\b(single|consultation)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const service = Array.isArray(services) ? services.find((item) => {
      const name = String(item.name ?? "").toLowerCase().replace(/\b(single|consultation)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
      return name === normalized || (name && normalized && (name.includes(normalized) || normalized.includes(name)));
    }) : undefined;
    const amount = Number(String(service?.price ?? "").replace(/,/g, "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Could not find this consultation's fee in Website Settings.");
    return amount;
  }

  async function updateStatus(row: Consultation & { id: string }, status: "Active" | "Done", keepUnpaid = false) {
    if (status === "Done" && row.paymentStatus !== "Paid" && !keepUnpaid) {
      setPendingCompletion(row);
      return;
    }
    setBusyId(row.id);
    try {
      await updateDoc(doc(getFirebaseDb(), "consultations", row.id), {
        status,
        archived: false,
        startedAt: row.startedAt ?? serverTimestamp(),
        completedAt: status === "Done" ? serverTimestamp() : deleteField(),
        statusBeforeCancel: deleteField(),
        updatedAt: serverTimestamp(),
      });
      setNotice(status === "Done" ? "Consultation marked Done." : "Consultation moved to Active.");
    } catch (cause) {
      setNotice((cause as Error).message || "Could not update consultation status.");
    } finally { setBusyId(null); }
  }

  async function markPaid(row: Consultation & { id: string }, andDone = false) {
    setBusyId(row.id);
    let fee: number;
    try { fee = await consultationFee(row); }
    catch (cause) { setNotice((cause as Error).message || "Could not determine the consultation fee."); setBusyId(null); return; }
    setBusyId(null);
    setPendingCompletion(null);
    setPaymentEntry({ row, fee, amount: String(row.paidAmount || fee), andDone });
  }

  async function savePaymentEntry() {
    if (!paymentEntry) return;
    const { row, fee, andDone } = paymentEntry;
    const amount = Number(paymentEntry.amount.trim());
    if (!Number.isFinite(amount) || amount <= 0) { setNotice("Enter a valid amount greater than ₹0."); return; }
    setBusyId(row.id);
    try {
      await updateDoc(doc(getFirebaseDb(), "consultations", row.id), {
        ...(andDone ? { status: "Done", archived: false, statusBeforeCancel: deleteField(), startedAt: row.startedAt ?? serverTimestamp(), completedAt: serverTimestamp() } : {}),
        paymentStatus: "Paid",
        paymentAmount: fee,
        paidAmount: amount,
        paidAt: serverTimestamp(),
        paymentDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
        updatedAt: serverTimestamp(),
      });
      setNotice(andDone ? "Payment recorded and consultation marked Done." : "Payment recorded.");
      setPendingCompletion(null);
      setPaymentEntry(null);
    } catch (cause) {
      setNotice((cause as Error).message || "Could not record payment.");
    } finally { setBusyId(null); }
  }

  return (
    <div>
      <h1 className="display text-3xl">Dashboard</h1>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" aria-live="polite" className="mt-4 rounded-sm border border-primary/30 bg-primary/5 px-4 py-3 text-sm">{notice}</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link to="/admin/consultations" search={{ status: "New" }} className="rounded-sm border border-gold/50 bg-card p-6 transition-colors hover:bg-gold/10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">New consultation requests</p>
          <p className="mt-2 font-display text-4xl">{rows ? newCount : "…"} <span className="text-lg text-muted-foreground">New</span></p>
        </Link>
        <Stat label="Total consultations" value={rows ? active.length : "…"} />
        <Stat label="Failed notifications" value={notes ? failed : "…"} />
      </div>
      <h2 className="mt-12 font-display text-xl">Latest requests</h2>
      <div className="mt-4 divide-y divide-border rounded-sm border border-border bg-card">
        {active.slice(0, 5).map((r) => {
          const status = normalizeConsultationStatus(r.status, r.archived);
          return <div key={r.id} tabIndex={0} aria-label={`Open ${r.consultationId} consultation details`} onClick={(event) => { if ((event.target as HTMLElement).closest("button, a")) return; void navigate({ to: "/admin/consultations", search: { consultationId: r.id } }); }} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); void navigate({ to: "/admin/consultations", search: { consultationId: r.id } }); } }} className="flex cursor-pointer flex-col items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="font-medium">{r.fullName}</p>
              <p className="text-sm text-muted-foreground">{r.consultationType} · {formatDate(r.preferredDate)} · {formatTime(r.preferredTime)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${r.paymentStatus === "Paid" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-amber-500/40 bg-amber-500/10 text-amber-800"}`}>{r.paymentStatus ?? "Unpaid"}{Number(r.paidAmount ?? 0) > 0 ? ` · ₹${Number(r.paidAmount).toLocaleString("en-IN")}` : ""}</span>
              <Link to="/admin/consultations" search={{ consultationId: r.id }} className="inline-flex min-h-10 items-center rounded-sm border border-border px-3 text-sm">View</Link>
              {status === "New" && <Button type="button" disabled={busyId !== null} onClick={() => void updateStatus(r, "Active")}>{busyId === r.id ? "Saving…" : "Move to Active"}</Button>}
              {status === "Active" && <Button type="button" disabled={busyId !== null} onClick={() => void updateStatus(r, "Done")}>{busyId === r.id ? "Saving…" : "Mark Done"}</Button>}
              {status === "Done" && <span className="rounded-sm border border-border px-3 py-2 text-sm">Done ✓</span>}
              {r.paymentStatus !== "Paid" && <Button type="button" variant="outline" disabled={busyId !== null} onClick={() => void markPaid(r)}>{busyId === r.id ? "Saving…" : "Mark Paid"}</Button>}
            </div>
          </div>;
        })}
        {rows && active.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No consultation requests yet.</p>}
      </div>
      <Dialog open={Boolean(pendingCompletion)} onOpenChange={(open) => !open && setPendingCompletion(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Mark consultation as Done?</DialogTitle><p className="text-sm text-muted-foreground">{pendingCompletion?.consultationId} is not marked Paid. Choose how to record completion.</p></DialogHeader>
          <div className="mt-4 grid gap-3">
            {pendingCompletion && <Button type="button" className="min-h-11" disabled={busyId !== null} onClick={() => void markPaid(pendingCompletion, true)}>Mark Paid & Done</Button>}
            {pendingCompletion && <Button type="button" variant="outline" className="min-h-11" disabled={busyId !== null} onClick={() => { const row = pendingCompletion; setPendingCompletion(null); void updateStatus(row, "Done", true); }}>Mark Done (Keep Unpaid)</Button>}
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setPendingCompletion(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(paymentEntry)} onOpenChange={(open) => !open && busyId === null && setPaymentEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-display">Record payment received</DialogTitle><p className="text-sm text-muted-foreground">{paymentEntry?.row.consultationId} · Consultation fee ₹{Number(paymentEntry?.fee ?? 0).toLocaleString("en-IN")}</p></DialogHeader>
          <label className="mt-4 grid gap-2 text-sm">Amount received (₹)<input autoFocus type="number" min="0.01" step="0.01" inputMode="decimal" value={paymentEntry?.amount ?? ""} onChange={(event) => setPaymentEntry((current) => current ? { ...current, amount: event.target.value } : current)} className="h-10 rounded-sm border border-input bg-card px-3 text-sm" /></label>
          <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-10" disabled={busyId !== null} onClick={() => setPaymentEntry(null)}>Cancel</Button><Button type="button" className="min-h-10" disabled={busyId !== null} onClick={() => void savePaymentEntry()}>{busyId ? "Saving…" : paymentEntry?.andDone ? "Mark Paid & Done" : "Save Payment"}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
    </div>
  );
}
