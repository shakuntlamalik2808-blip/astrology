import { AppointmentsCalendar } from "@/components/appointments-calendar";
import { Badge } from "@/components/ui/badge";

export default function AdminAppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Standard 1-hour Kundli readings versus 15-minute daily counseling check-ins.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="gold">Kundli · 60 min</Badge>
          <Badge variant="muted">Daily counseling · 15 min</Badge>
        </div>
      </div>
      <AppointmentsCalendar />
    </div>
  );
}
