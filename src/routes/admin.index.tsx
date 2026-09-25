import { createFileRoute, Link } from "@tanstack/react-router";
import { useConsultations, useNotifications } from "@/lib/admin-data";
import { formatDate, formatTime } from "@/lib/consultations";
import { StatusBadge } from "@/components/admin/StatusBadge";

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
  const { rows, error } = useConsultations();
  const { rows: notes } = useNotifications();
  const active = rows?.filter((r) => !r.archived) ?? [];
  const newCount = active.filter((r) => r.status === "New").length;
  const failed = notes?.filter((n) => n.status === "Failed").length ?? 0;

  return (
    <div>
      <h1 className="display text-3xl">Dashboard</h1>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
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
        {active.slice(0, 5).map((r) => (
          <div key={r.id} className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="font-medium">{r.fullName}</p>
              <p className="text-sm text-muted-foreground">{r.consultationType} · {formatDate(r.preferredDate)} · {formatTime(r.preferredTime)}</p>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
        {rows && active.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No consultation requests yet.</p>}
      </div>
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
