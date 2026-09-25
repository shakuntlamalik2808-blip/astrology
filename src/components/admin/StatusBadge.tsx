import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  New: "bg-gold/20 text-foreground border-gold/60",
  Contacted: "bg-celestial/15 text-foreground border-celestial/50",
  Confirmed: "bg-primary/15 text-foreground border-primary/50",
  Completed: "bg-muted text-muted-foreground border-border",
  Cancelled: "bg-terracotta/15 text-terracotta border-terracotta/50",
  "Follow-up Required": "bg-terracotta/10 text-foreground border-terracotta/40",
  Sent: "bg-primary/15 text-foreground border-primary/50",
  Pending: "bg-gold/20 text-foreground border-gold/60",
  Failed: "bg-terracotta/15 text-terracotta border-terracotta/50",
  "Not Configured": "bg-muted text-muted-foreground border-border",
  Connected: "bg-primary/15 text-foreground border-primary/50",
  Error: "bg-terracotta/15 text-terracotta border-terracotta/50",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status] ?? styles["Completed"])}>
      {status}
    </span>
  );
}
