import { ClientsCrm } from "@/components/clients-crm";

export default function AdminClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Client CRM</h1>
        <p className="text-sm text-muted-foreground">
          Birth data, Vastu plans, and daily counseling notes. Persist via <code>/api/clients</code>.
        </p>
      </div>
      <ClientsCrm />
    </div>
  );
}
