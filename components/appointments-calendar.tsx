"use client";

import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockAppointments } from "@/lib/data";

export function AppointmentsCalendar() {
  const grouped = mockAppointments.reduce<Record<string, typeof mockAppointments>>((acc, appt) => {
    const day = format(parseISO(appt.startsAt), "yyyy-MM-dd");
    acc[day] = acc[day] ? [...acc[day], appt] : [appt];
    return acc;
  }, {});

  const days = Object.keys(grouped).sort();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {days.map((day) => (
        <Card key={day}>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(parseISO(day), "EEEE, d MMMM")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped[day]
              .slice()
              .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
              .map((appt) => (
                <div key={appt.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{appt.client}</p>
                    <Badge variant={appt.type === "KUNDLI" ? "gold" : "muted"}>
                      {appt.type === "KUNDLI" ? "Kundli · 60 min" : "Daily · 15 min"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {format(parseISO(appt.startsAt), "HH:mm")} IST · {appt.durationMin} minutes
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
