import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useConsultations } from "@/lib/admin-data";
import { bookingSlotId, formatDate, formatTime } from "@/lib/consultations";
import { getFirebaseDb } from "@/lib/firebase";

export const Route = createFileRoute("/admin/availability")({ component: AvailabilityPage });

type Slot = { id: string; date: string; time: string; enabled: boolean };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateKey = (value: string) => new Date(`${value}T12:00:00`);

function AvailabilityPage() {
  const { rows: consultations, error: consultationsError } = useConsultations();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [time, setTime] = useState("10:00");
  const [feedback, setFeedback] = useState("");

  useEffect(() => onSnapshot(collection(getFirebaseDb(), "availableSlots"), (snapshot) => {
    setSlots(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Slot));
  }, (error) => setFeedback(error.message)), []);

  const booked = useMemo(() => (consultations ?? []).filter((item) => item.status !== "Cancelled"), [consultations]);
  const bookedKeys = useMemo(() => new Set(booked.map((item) => bookingSlotId(item.preferredDate, item.preferredTime))), [booked]);
  const selectedSlots = slots.filter((slot) => slot.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const selectedBookings = booked.filter((item) => item.preferredDate === selectedDate).sort((a, b) => a.preferredTime.localeCompare(b.preferredTime));
  const markedDays = useMemo(() => {
    const dates = new Set([...slots.map((slot) => slot.date), ...booked.map((item) => item.preferredDate)]);
    return [...dates].map(fromDateKey);
  }, [slots, booked]);

  useEffect(() => {
    if (!consultations) return;
    // Backfill minimal public markers for bookings created before slot management was added.
    for (const item of consultations) {
      if (item.status === "Cancelled" || !item.preferredDate || !item.preferredTime) continue;
      void setDoc(doc(getFirebaseDb(), "bookedSlots", bookingSlotId(item.preferredDate, item.preferredTime)), {
        date: item.preferredDate,
        time: item.preferredTime,
        consultationId: item.consultationId,
      }, { merge: true }).catch((error) => console.error("Could not sync booked slot:", error));
    }
  }, [consultations]);

  const addSlot = async () => {
    const id = bookingSlotId(selectedDate, time);
    if (bookedKeys.has(id)) { setFeedback("That time is already booked and cannot be opened."); return; }
    try {
      await setDoc(doc(getFirebaseDb(), "availableSlots", id), { date: selectedDate, time, enabled: true });
      setFeedback(`${formatTime(time)} is now available on ${formatDate(selectedDate)}.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not add this time."); }
  };

  const removeSlot = async (slot: Slot) => {
    if (bookedKeys.has(slot.id)) { setFeedback("This time has a booking and cannot be removed from the calendar."); return; }
    try { await deleteDoc(doc(getFirebaseDb(), "availableSlots", slot.id)); setFeedback("Availability removed."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Could not remove this time."); }
  };

  return <div className="max-w-6xl space-y-6">
    <div><p className="eyebrow text-gold">Bookings</p><h1 className="display mt-2 text-3xl">Availability calendar</h1><p className="mt-2 text-sm text-muted-foreground">Choose a date to open appointment times. Booked times are shown here and hidden from the website form.</p></div>
    <div className="grid gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
      <section className="rounded-sm border border-border bg-card p-4 sm:p-6">
        <Calendar mode="single" selected={fromDateKey(selectedDate)} onSelect={(date) => date && setSelectedDate(dateKey(date))} modifiers={{ scheduled: markedDays }} modifiersClassNames={{ scheduled: "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-gold" }} />
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-gold" />Dates with availability or bookings</div>
      </section>
      <section className="space-y-5 rounded-sm border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-2"><CalendarDays className="size-4 text-gold" /><h2 className="font-display text-xl">{formatDate(selectedDate)}</h2></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm">Open a time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 block h-10 rounded-sm border border-input bg-background px-3 text-sm [color-scheme:light]" /></label>
          <button type="button" onClick={() => void addSlot()} className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm text-primary-foreground"><Plus className="size-4" />Make available</button>
        </div>
        {feedback && <p role="status" className="text-sm text-muted-foreground">{feedback}</p>}
        {consultationsError && <p className="text-sm text-destructive">{consultationsError}</p>}
        <div><h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Availability</h3><div className="mt-3 flex flex-wrap gap-2">
          {selectedSlots.map((slot) => <div key={slot.id} className={`inline-flex items-center gap-2 rounded-sm border px-3 py-2 text-sm ${bookedKeys.has(slot.id) ? "border-terracotta/50 bg-terracotta/10" : "border-border bg-background"}`}><span>{formatTime(slot.time)}{bookedKeys.has(slot.id) ? " · Booked" : " · Open"}</span>{!bookedKeys.has(slot.id) && <button type="button" aria-label={`Remove ${formatTime(slot.time)}`} onClick={() => void removeSlot(slot)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>}</div>)}
          {!selectedSlots.length && <p className="text-sm text-muted-foreground">No times opened for this date.</p>}
        </div></div>
        <div><h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Booked consultations</h3><div className="mt-3 divide-y divide-border rounded-sm border border-border">
          {selectedBookings.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"><div><p className="font-medium">{item.fullName}</p><p className="text-xs text-muted-foreground">{item.consultationType}</p></div><span>{formatTime(item.preferredTime)}</span></div>)}
          {!consultations && <p className="px-3 py-4 text-sm text-muted-foreground">Loading bookings…</p>}
          {consultations && !selectedBookings.length && <p className="px-3 py-4 text-sm text-muted-foreground">No bookings on this date.</p>}
        </div></div>
      </section>
    </div>
  </div>;
}
