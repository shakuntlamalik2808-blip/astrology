import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { z } from "zod";
import { useConsultations } from "@/lib/admin-data";
import { getFirebaseDb } from "@/lib/firebase";
import { CONSULTATION_TYPES, STATUSES, formatDate, formatTime, type Consultation } from "@/lib/consultations";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/consultations")({
  validateSearch: z.object({ status: z.string().optional() }),
  component: ConsultationsPage,
});

type Row = Consultation & { id: string };
type SortKey = "createdAt" | "preferredDate" | "fullName";

function ConsultationsPage() {
  const search = Route.useSearch();
  const { rows, error } = useConsultations();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(search.status ?? "All");
  const [type, setType] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [open, setOpen] = useState<Row | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => (showArchived ? r.archived : !r.archived))
      .filter((r) => status === "All" || r.status === status)
      .filter((r) => type === "All" || r.consultationType === type)
      .filter((r) => !t || [r.fullName, r.email, r.whatsappNumber, r.consultationId, r.currentCity].some((v) => v?.toLowerCase().includes(t)))
      .sort((a, b) => {
        if (sort === "fullName") return a.fullName.localeCompare(b.fullName);
        if (sort === "preferredDate") return (a.preferredDate + a.preferredTime).localeCompare(b.preferredDate + b.preferredTime);
        return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
      });
  }, [rows, q, status, type, showArchived, sort]);

  const sel = "h-10 rounded-sm border border-input bg-card px-3 text-sm";

  return (
    <div>
      <h1 className="display text-3xl">Consultations</h1>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <input placeholder="Search name, email, phone, ID…" value={q} onChange={(e) => setQ(e.target.value)} className={`${sel} min-w-60 flex-1`} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel} aria-label="Status filter">
          <option>All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={sel} aria-label="Type filter">
          <option>All</option>
          {CONSULTATION_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={sel} aria-label="Sort">
          <option value="createdAt">Newest first</option>
          <option value="preferredDate">Preferred date</option>
          <option value="fullName">Name A–Z</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Archived
        </label>
      </div>

      <div className="mt-6 overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              {["Customer", "Consultation", "Preferred Date", "Preferred Time", "Status"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((r) => (
              <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer transition-colors hover:bg-muted/50">
                <td className="px-5 py-3"><p className="font-medium">{r.fullName}</p><p className="text-xs text-muted-foreground">{r.whatsappNumber}</p></td>
                <td className="px-5 py-3">{r.consultationType.replace(" Consultation", "")}</td>
                <td className="px-5 py-3">{formatDate(r.preferredDate)}</td>
                <td className="px-5 py-3">{formatTime(r.preferredTime)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {rows && list.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No matching consultations.</td></tr>}
            {!rows && !error && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {open && <Editor row={open} onClose={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Editor({ row, onClose }: { row: Row; onClose: () => void }) {
  const [form, setForm] = useState({
    status: row.status,
    notes: row.notes ?? "",
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime,
    consultationType: row.consultationType,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = doc(getFirebaseDb(), "consultations", row.id);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 h-10 w-full rounded-sm border border-input bg-background px-3 text-sm";
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{row.fullName}</DialogTitle>
        <p className="text-xs text-muted-foreground">{row.consultationId} · {row.source}</p>
      </DialogHeader>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {[
          ["WhatsApp", row.whatsappNumber],
          ["Email", row.email],
          ["Date of birth", formatDate(row.dateOfBirth)],
          ["Time of birth", formatTime(row.timeOfBirth)],
          ["Place of birth", row.placeOfBirth],
          ["Current city", row.currentCity],
        ].map(([k, v]) => (
          <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>
        ))}
        {row.additionalMessage && <div className="col-span-2"><dt className="text-xs text-muted-foreground">Message</dt><dd className="whitespace-pre-wrap">{row.additionalMessage}</dd></div>}
      </dl>
      <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Status
          <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Row["status"] })}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Consultation
          <select className={input} value={form.consultationType} onChange={(e) => setForm({ ...form, consultationType: e.target.value })}>
            {CONSULTATION_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Preferred date
          <input type="date" className={input} value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">Preferred time
          <input type="time" className={input} value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground sm:col-span-2">Internal notes
          <textarea rows={3} className={`${input} h-auto py-2`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => run(() => updateDoc(ref, { archived: !row.archived, updatedAt: serverTimestamp() }))} className="h-10 rounded-sm border border-border px-4 text-sm hover:bg-muted">
            {row.archived ? "Unarchive" : "Archive"}
          </button>
          <button disabled={busy} onClick={() => confirm("Delete this consultation permanently?") && run(() => deleteDoc(ref))} className="h-10 rounded-sm border border-destructive/50 px-4 text-sm text-destructive hover:bg-destructive/10">
            Delete
          </button>
        </div>
        <button disabled={busy} onClick={() => run(() => updateDoc(ref, { ...form, updatedAt: serverTimestamp() }))} className="h-10 rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  );
}
