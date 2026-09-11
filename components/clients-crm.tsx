"use client";

import { useMemo, useState } from "react";
import { mockClients } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ClientsCrm() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(mockClients[0]?.id);
  const [notesDraft, setNotesDraft] = useState("");
  const [clients, setClients] = useState(mockClients);

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.fullName.toLowerCase().includes(query.toLowerCase()) ||
          c.email.toLowerCase().includes(query.toLowerCase())
      ),
    [clients, query]
  );

  const selected = clients.find((c) => c.id === selectedId) ?? filtered[0];

  function saveNote() {
    if (!selected || !notesDraft.trim()) return;
    setClients((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, notes: [notesDraft.trim(), ...c.notes] } : c))
    );
    setNotesDraft("");
  }

  function updateField(field: "vastuFloorPlan" | "birthTime" | "birthPlace", value: string) {
    if (!selected) return;
    setClients((prev) => prev.map((c) => (c.id === selected.id ? { ...c, [field]: value } : c)));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
          <Input
            placeholder="Search name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-3"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Birth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => (
                <TableRow
                  key={client.id}
                  data-state={client.id === selected?.id ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(client.id)}
                >
                  <TableCell className="font-medium">{client.fullName}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.timezone}</TableCell>
                  <TableCell>
                    {client.birthDate} {client.birthTime}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>{selected.fullName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selected.email} · {selected.phone}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Birth place</Label>
                <Input
                  value={selected.birthPlace}
                  onChange={(e) => updateField("birthPlace", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Birth time</Label>
                <Input
                  value={selected.birthTime}
                  onChange={(e) => updateField("birthTime", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vastu floor plan notes</Label>
              <Textarea
                value={selected.vastuFloorPlan}
                onChange={(e) => updateField("vastuFloorPlan", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Day-to-day counseling log</Label>
              <Textarea
                placeholder="Session note…"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
              />
              <Button type="button" onClick={saveNote} size="sm">
                Append note
              </Button>
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {selected.notes.map((note, i) => (
                <li key={i} className="rounded-md bg-secondary p-3 text-foreground">
                  {note}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
