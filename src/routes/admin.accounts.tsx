import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useConsultations } from "@/lib/admin-data";
import { PAYMENT_STATUSES, formatDate, type PaymentStatus } from "@/lib/consultations";

export const Route = createFileRoute("/admin/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — Studio" },
      { name: "description", content: "Payment records and monthly collections." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountsPage,
});

type PaymentRow = {
  id: string;
  consultationId: string;
  fullName: string;
  consultationType: string;
  preferredDate: string;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paymentMethod: string;
  paymentReference: string;
  paymentDate: string;
  createdAt?: { toDate: () => Date };
};

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthDateRange(value: string) {
  return { start: `${value}-01`, end: `${value}-31` };
}

function dateForRow(row: PaymentRow) {
  if (row.paymentDate) return row.paymentDate;
  if (!row.createdAt) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(row.createdAt.toDate());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function AccountsPage() {
  const { rows, error } = useConsultations();
  const thisMonth = currentMonth();
  const [fromMonth, setFromMonth] = useState(() => shiftMonth(thisMonth, -5));
  const [toMonth, setToMonth] = useState(thisMonth);
  const [paymentFilter, setPaymentFilter] = useState<"All" | PaymentStatus>("All");
  const invalidRange = !/^\d{4}-\d{2}$/.test(fromMonth) || !/^\d{4}-\d{2}$/.test(toMonth) || fromMonth > toMonth;

  const payments = useMemo(() => (rows ?? []).map((row) => ({
    id: row.id,
    consultationId: row.consultationId,
    fullName: row.fullName,
    consultationType: row.consultationType,
    preferredDate: row.preferredDate,
    paymentStatus: row.paymentStatus ?? "Unpaid",
    paidAmount: Number(row.paidAmount ?? 0),
    paymentMethod: row.paymentMethod ?? "",
    paymentReference: row.paymentReference ?? "",
    paymentDate: row.paymentDate ?? "",
    createdAt: row.createdAt,
  } satisfies PaymentRow)), [rows]);

  const filteredRows = useMemo(() => payments.filter((row) => {
    if (paymentFilter !== "All" && row.paymentStatus !== paymentFilter) return false;
    if (invalidRange) return false;
    const date = dateForRow(row);
    if (!date) return true;
    const range = monthDateRange(fromMonth);
    const end = monthDateRange(toMonth).end;
    return date >= range.start && date <= end;
  }), [payments, paymentFilter, invalidRange, fromMonth, toMonth]);

  const report = useMemo(() => {
    if (invalidRange) return { chart: [], received: 0, recorded: 0, outstanding: 0 };
    const months: string[] = [];
    for (let month = fromMonth; month <= toMonth && months.length < 120; month = shiftMonth(month, 1)) months.push(month);
    const totals = new Map(months.map((month) => [month, 0]));
    let received = 0;
    let recorded = 0;
    for (const row of payments) {
      if (paymentFilter !== "All" && row.paymentStatus !== paymentFilter) continue;
      const month = row.paymentDate.slice(0, 7);
      if (!row.paymentDate || !totals.has(month)) continue;
      if (row.paidAmount > 0) {
        totals.set(month, (totals.get(month) ?? 0) + row.paidAmount);
        received += row.paidAmount;
        recorded += 1;
      }
    }
    const outstanding = filteredRows.filter((row) => row.paymentStatus !== "Paid").length;
    return {
      chart: months.map((month) => ({ month: monthLabel(month), amount: totals.get(month) ?? 0 })),
      received,
      recorded,
      outstanding,
    };
  }, [payments, filteredRows, fromMonth, toMonth, paymentFilter, invalidRange]);

  const fieldClass = "h-10 rounded-sm border border-input bg-card px-3 text-sm";

  return (
    <div>
      <div>
        <p className="eyebrow text-gold">Admin accounts</p>
        <h1 className="display mt-2 text-3xl">Payments</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track payments recorded manually for consultation bookings.</p>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

      <section aria-label="Payment filters" className="mt-7 rounded-sm border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <label className="grid gap-2 text-xs text-muted-foreground">From month<input type="month" required value={fromMonth} max={toMonth || undefined} onChange={(event) => setFromMonth(event.target.value)} className={fieldClass} /></label>
          <label className="grid gap-2 text-xs text-muted-foreground">To month<input type="month" required value={toMonth} min={fromMonth || undefined} onChange={(event) => setToMonth(event.target.value)} className={fieldClass} /></label>
          <label className="grid gap-2 text-xs text-muted-foreground">Payment status<select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as "All" | PaymentStatus)} className={fieldClass}><option>All</option>{PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        </div>
        {invalidRange && <p role="alert" className="mt-3 text-sm text-destructive">Choose valid months and make sure the start month is before or equal to the end month.</p>}
      </section>

      <section aria-label="Payment summary" className="mt-5 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Payments received in range" value={rows ? currency(report.received) : "…"} />
        <SummaryCard label="Payments recorded" value={rows ? report.recorded : "…"} />
        <SummaryCard label="Outstanding consultations" value={rows ? report.outstanding : "…"} />
      </section>

      <section className="mt-7 rounded-sm border border-border bg-card p-4 sm:p-6">
        <div>
          <h2 className="font-display text-xl">Monthly payments</h2>
          <p className="mt-1 text-sm text-muted-foreground">Based on the payment dates entered in consultation records.</p>
        </div>
        <div className="mt-5 h-72 w-full">
          {report.chart.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.chart} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value: number) => `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickLine={false} axisLine={false} width={72} />
                <Tooltip formatter={(value) => [currency(Number(value)), "Payments"]} contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: 4 }} />
                <Line type="monotone" dataKey="amount" name="Payments" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Only payments with an amount and payment date are counted in the chart and received total. Update missing details under Admin → Consultations.</p>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Payment records</h2>
            <p className="mt-1 text-sm text-muted-foreground">Date range uses payment date, or booking date when payment date is blank.</p>
          </div>
          <span className="text-sm text-muted-foreground">{rows ? `${filteredRows.length} records` : "Loading…"}</span>
        </div>
        <div className="mt-4 overflow-x-auto rounded-sm border border-border bg-card">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr>{["Customer / ID", "Consultation", "Booking date", "Payment status", "Amount received", "Method", "Payment date", "Reference"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3"><p className="font-medium">{row.fullName}</p><p className="text-xs text-muted-foreground">{row.consultationId}</p></td>
                  <td className="px-4 py-3">{row.consultationType}</td>
                  <td className="px-4 py-3">{formatDate(row.preferredDate)}</td>
                  <td className="px-4 py-3">{row.paymentStatus}</td>
                  <td className="px-4 py-3">{currency(row.paidAmount)}</td>
                  <td className="px-4 py-3">{row.paymentMethod || "—"}</td>
                  <td className="px-4 py-3">{row.paymentDate ? formatDate(row.paymentDate) : "Not recorded"}</td>
                  <td className="max-w-48 truncate px-4 py-3" title={row.paymentReference}>{row.paymentReference || "—"}</td>
                </tr>
              ))}
              {rows && filteredRows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">No payment records match these filters.</td></tr>}
              {!rows && !error && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">Loading payment records…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-sm border border-border bg-card p-5"><p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}
