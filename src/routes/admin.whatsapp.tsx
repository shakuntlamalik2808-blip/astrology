import { createFileRoute } from "@tanstack/react-router";
import { tsToString, useWhatsappSettings } from "@/lib/admin-data";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/whatsapp")({
  component: WhatsappPage,
});

function WhatsappPage() {
  const s = useWhatsappSettings();
  return (
    <div className="max-w-2xl">
      <h1 className="display text-3xl">WhatsApp Integration</h1>
      <div className="mt-8 rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="font-medium">Status</p>
          {s ? <StatusBadge status={s.status} /> : <span className="text-sm text-muted-foreground">Loading…</span>}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Admin alerts go to +91 98118 40795. Last checked: {tsToString(s?.updatedAt)}</p>
        {s?.lastError && <p className="mt-3 text-sm text-destructive">{s.lastError}</p>}
      </div>
      <div className="mt-6 text-sm leading-relaxed text-muted-foreground">
        <p>Credentials are never stored in the website. To connect, set these secrets on the Firebase Cloud Function:</p>
        <pre className="mt-3 rounded-sm bg-muted p-4 text-xs text-foreground">firebase functions:secrets:set WHATSAPP_API_TOKEN{"\n"}firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID{"\n"}firebase deploy --only functions</pre>
        <p className="mt-3">The status updates automatically after the next consultation request is processed.</p>
      </div>
    </div>
  );
}
