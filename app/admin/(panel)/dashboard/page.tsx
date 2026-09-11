import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAppointments, mockClients, mockPayments, courses } from "@/lib/data";

export default function AdminDashboardPage() {
  const newBookings = mockPayments.filter((p) => p.kind === "SINGLE_CONSULTATION").length;
  const upcomingDaily = mockAppointments.filter((a) => a.type === "DAILY_COUNSELING").length;
  const enrollments = mockPayments.filter((p) => p.kind === "COURSE").length;

  const metrics = [
    { label: "New bookings", value: newBookings, hint: "₹2100 Kundli fees this period" },
    { label: "Upcoming daily sessions", value: upcomingDaily, hint: "15-minute check-ins on the calendar" },
    { label: "Course enrollments", value: enrollments + 11, hint: `${courses.length} active cohorts` },
    { label: "Active clients", value: mockClients.length, hint: "CRM records" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of bookings, retainers, and academy seats.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-4xl">{metric.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
