"use client";

import { useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919000000000").replace(/\D/g, "");

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const SLOTS = ["07:30", "09:00", "10:00", "11:30", "14:00", "16:00", "18:00", "20:00"];

export function BookingForm() {
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [date, setDate] = useState(format(addDays(new Date(), 2), "yyyy-MM-dd"));
  const [slot, setSlot] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const week = useMemo(() => {
    const start = startOfWeek(new Date(date), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!slot) {
      setStatus("error");
      setMessage("Please select a time slot before sending your consultation request.");
      return;
    }

    setStatus("loading");

    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const birthDate = String(form.get("birthDate") ?? "").trim();
    const birthTime = String(form.get("birthTime") ?? "").trim();
    const birthPlace = String(form.get("birthPlace") ?? "").trim();

    const text = [
      "Hello, I would like to book a consultation.",
      `Name: ${name}`,
      `Email: ${email}`,
      `Preferred timezone: ${timezone}`,
      `Preferred date: ${date}`,
      `Preferred slot: ${slot}`,
      `Birth date: ${birthDate || "Not provided"}`,
      `Birth time: ${birthTime || "Not provided"}`,
      `Birth place: ${birthPlace || "Not provided"}`,
      "Please confirm the booking.",
    ].join("\n");

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setStatus("ok");
    setMessage("Your WhatsApp booking request is ready to send.");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Choose a time</CardTitle>
          <CardDescription>
            Slots are shown in the timezone you select. The session is 60 minutes, held on video.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Your timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {week.map((day) => {
              const value = format(day, "yyyy-MM-dd");
              const selected = value === date;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDate(value)}
                  className={`rounded-lg border px-1 py-3 text-center text-xs ${
                    selected ? "border-gold bg-gold/15" : "hover:bg-secondary"
                  }`}
                >
                  <div className="text-muted-foreground">{format(day, "EEE")}</div>
                  <div className="mt-1 font-serif text-lg">{format(day, "d")}</div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SLOTS.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setSlot(time)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  slot === time ? "border-gold bg-gold/15" : "hover:bg-secondary"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Displayed as wall-clock time in <strong>{timezone}</strong>. Studio clocks run on Asia/Kolkata.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consultation request</CardTitle>
          <CardDescription>Share your details and preferred time. We’ll confirm by WhatsApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required placeholder="As you would like it on notes" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth date</Label>
              <Input id="birthDate" name="birthDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthTime">Birth time</Label>
              <Input id="birthTime" name="birthTime" type="time" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthPlace">Birth place</Label>
            <Input id="birthPlace" name="birthPlace" placeholder="City, country" required />
          </div>
          <Button type="submit" variant="gold" className="w-full" disabled={!slot || status === "loading"}>
            {status === "loading" ? "Preparing message…" : "Send WhatsApp request"}
          </Button>
          {message ? (
            <p className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>
          ) : null}
        </CardContent>
      </Card>
    </form>
  );
}
