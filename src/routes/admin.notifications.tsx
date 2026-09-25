import { createFileRoute } from "@tanstack/react-router";
import { tsToString, useNotifications } from "@/lib/admin-data";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { rows, error } = useNotifications();
  return (
    <div>
      <h1 className="display text-3xl">Notifications</h1>
      <p className="mt-2 text-sm text-muted-foreground">WhatsApp alerts sent to the admin for each website consultation request.</p>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 space-y-3">
        {rows?.map((n) => (
          <details key={n.id} className="rounded-sm border border-border bg-card px-5 py-4">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <span className="text-sm"><span className="font-medium">{n.consultationId}</span> → {n.recipient}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">{tsToString(n.createdAt)} <StatusBadge status={n.status} /></span>
            </summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-muted-foreground">{n.message}</pre>
            {n.sentAt && <p className="mt-2 text-xs">Sent: {tsToString(n.sentAt)}</p>}
            {n.error && <p className="mt-2 text-xs text-destructive">Error: {n.error}</p>}
          </details>
        ))}
        {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
      </div>
    </div>
  );
}
