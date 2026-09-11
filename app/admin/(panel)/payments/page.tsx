import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockPayments } from "@/lib/data";
import { formatInr } from "@/lib/utils";

const kindLabel: Record<string, string> = {
  SINGLE_CONSULTATION: "Single consultation ₹2100",
  DAILY_RETAINER: "Daily counseling retainer",
  COURSE: "Academy enrollment",
  VASTU_AUDIT: "Vastu audit",
};

export default function AdminPaymentsPage() {
  const consultationTotal = mockPayments
    .filter((p) => p.kind === "SINGLE_CONSULTATION" && p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + p.amountInr, 0);
  const retainerTotal = mockPayments
    .filter((p) => p.kind === "DAILY_RETAINER" && p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + p.amountInr, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Incoming ₹2100 consultation fees and recurring daily counseling packages.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <p>
          Consultations collected: <strong>{formatInr(consultationTotal)}</strong>
        </p>
        <p>
          Retainers collected: <strong>{formatInr(retainerTotal)}</strong>
        </p>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{payment.date}</TableCell>
                <TableCell>{payment.client}</TableCell>
                <TableCell>{kindLabel[payment.kind] ?? payment.kind}</TableCell>
                <TableCell>{formatInr(payment.amountInr)}</TableCell>
                <TableCell>
                  <Badge variant={payment.status === "SUCCEEDED" ? "gold" : "muted"}>{payment.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
