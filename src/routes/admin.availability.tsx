import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { CalendarDays, Copy, Plus, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useConsultations } from "@/lib/admin-data";
import { bookingSlotId, formatDate, formatTime } from "@/lib/consultations";
import { getFirebaseDb } from "@/lib/firebase";

export const Route = createFileRoute("/admin/availability")({ component: AvailabilityPage });

type Slot = { id: string; date: string; time: string; enabled: boolean };
type BookedSlot = { id: string; date: string; time: string; consultationId: string };
type ApplyMode = "merge" | "replace";
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const fromDateKey = (value: string) => new Date(`${value}T12:00:00`);
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

function makeTimeRange(start: string, end: string, interval: number) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startValue = startHour * 60 + startMinute;
  const endValue = endHour * 60 + endMinute;
  if (startValue >= endValue) return [];
  const times: string[] = [];
  for (let value = startValue; value < endValue; value += interval) {
    times.push(`${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`);
  }
  return times;
}

async function commitWrites(writes: Array<(batch: ReturnType<typeof writeBatch>) => void>) {
  // Firestore limits a batch to 500 writes; keep a safety margin for future fields.
  for (const group of chunk(writes, 450)) {
    const batch = writeBatch(getFirebaseDb());
    group.forEach((write) => write(batch));
    await batch.commit();
  }
}

function AvailabilityPage() {
  const { rows: consultations, error: consultationsError } = useConsultations();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookedMarkers, setBookedMarkers] = useState<BookedSlot[]>([]);
  const [bookingsReady, setBookingsReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [time, setTime] = useState("10:00");
  const [rangeStart, setRangeStart] = useState("10:00");
  const [rangeEnd, setRangeEnd] = useState("18:00");
  const [interval, setInterval] = useState(30);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [copySource, setCopySource] = useState<"open-slots" | "time-range">("open-slots");
  const [targetMethod, setTargetMethod] = useState<"dates" | "range">("dates");
  const [targetDates, setTargetDates] = useState<Date[]>([]);
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [applyMode, setApplyMode] = useState<ApplyMode>("merge");

  useEffect(() => onSnapshot(collection(getFirebaseDb(), "availableSlots"), (snapshot) => {
    setSlots(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Slot));
  }, (error) => setFeedback(error.message)), []);

  useEffect(() => onSnapshot(collection(getFirebaseDb(), "bookedSlots"), (snapshot) => {
    setBookedMarkers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as BookedSlot));
    setBookingsReady(true);
  }, (error) => { setFeedback(error.message); setBookingsReady(true); }), []);

  const booked = useMemo(() => (consultations ?? []).filter((item) => item.status !== "Cancelled"), [consultations]);
  const bookedKeys = useMemo(() => new Set([
    ...booked.map((item) => bookingSlotId(item.preferredDate, item.preferredTime)),
    ...bookedMarkers.map((item) => item.id),
  ]), [booked, bookedMarkers]);
  const selectedSlots = slots.filter((slot) => slot.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const selectedBookings = booked.filter((item) => item.preferredDate === selectedDate).sort((a, b) => a.preferredTime.localeCompare(b.preferredTime));
  const markedDays = useMemo(() => {
    const dates = new Set([...slots.map((slot) => slot.date), ...booked.map((item) => item.preferredDate)]);
    return [...dates].map(fromDateKey);
  }, [slots, booked]);
  const rangeTimes = useMemo(() => makeTimeRange(rangeStart, rangeEnd, interval), [rangeStart, rangeEnd, interval]);
  const ready = bookingsReady && consultations !== null;

  useEffect(() => {
    if (!consultations) return;
    // Backfill booked-slot markers for existing bookings; preserve records already present.
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

  async function applySingleDayRange(action: "open" | "close") {
    if (!ready || !rangeTimes.length) { setFeedback("Choose a valid start and end time, and wait for bookings to load."); return; }
    const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    let changed = 0;
    let preserved = 0;
    for (const slotTime of rangeTimes) {
      const id = bookingSlotId(selectedDate, slotTime);
      if (bookedKeys.has(id)) { preserved++; continue; }
      const existing = slots.find((slot) => slot.id === id);
      if (action === "open") {
        if (!existing?.enabled) {
          operations.push((batch) => batch.set(doc(getFirebaseDb(), "availableSlots", id), { date: selectedDate, time: slotTime, enabled: true }));
          changed++;
        }
      } else if (existing) {
        operations.push((batch) => batch.delete(doc(getFirebaseDb(), "availableSlots", id)));
        changed++;
      }
    }
    if (!operations.length) { setFeedback(`No unbooked slots needed changes. ${preserved} booked slots preserved.`); return; }
    setLoading(true); setFeedback("");
    try {
      await commitWrites(operations);
      setFeedback(`${action === "open" ? "Opened" : "Closed"} ${changed} slots on ${formatDate(selectedDate)}. ${preserved} booked slots preserved.`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not update the time range."); }
    finally { setLoading(false); }
  }

  function targetDateKeys() {
    if (targetMethod === "dates") return [...new Set(targetDates.map(dateKey))].filter((date) => date !== selectedDate);
    const from = fromDateKey(fromDate); const to = fromDateKey(toDate);
    if (!fromDate || !toDate || from > to) return [];
    const result: string[] = [];
    const cursor = new Date(from);
    while (cursor <= to && result.length <= 366) {
      if (days.includes(cursor.getDay()) && dateKey(cursor) !== selectedDate) result.push(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }

  async function applySchedule() {
    if (!ready) { setFeedback("Wait for booking information to load before applying a schedule."); return; }
    const targets = targetDateKeys();
    const sourceTimes = copySource === "open-slots"
      ? selectedSlots.filter((slot) => slot.enabled).map((slot) => slot.time)
      : rangeTimes;
    if (targetMethod === "range" && fromDateKey(fromDate) > fromDateKey(toDate)) { setFeedback("The end date must be on or after the start date."); return; }
    if (targetMethod === "range" && !days.length) { setFeedback("Select at least one weekday."); return; }
    if (!targets.length) { setFeedback("Select at least one target date other than the active date."); return; }
    if (!sourceTimes.length) { setFeedback(copySource === "open-slots" ? "The active date has no open slots to copy." : "Choose a valid time range first."); return; }
    if (targetMethod === "range" && fromDateKey(toDate) > fromDateKey(fromDate)) {
      const span = Math.floor((fromDateKey(toDate).getTime() - fromDateKey(fromDate).getTime()) / 86400000);
      if (span > 365) { setFeedback("Choose a date range of one year or less."); return; }
    }

    const source = [...new Set(sourceTimes)].sort();
    const sourceSet = new Set(source);
    const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
    let opened = 0; let closed = 0;
    const targetSet = new Set(targets);
    const preserved = new Set([...bookedKeys].filter((id) => targetSet.has(id.slice(0, 10))));
    for (const target of targets) {
      const existing = slots.filter((slot) => slot.date === target && slot.enabled);
      const allTimes = applyMode === "replace" ? new Set([...existing.map((slot) => slot.time), ...source]) : new Set(source);
      for (const slotTime of allTimes) {
        const id = bookingSlotId(target, slotTime);
        if (bookedKeys.has(id)) continue;
        const slot = slots.find((item) => item.id === id);
        if (sourceSet.has(slotTime)) {
          if (!slot?.enabled) {
            writes.push((batch) => batch.set(doc(getFirebaseDb(), "availableSlots", id), { date: target, time: slotTime, enabled: true }));
            opened++;
          }
        } else if (applyMode === "replace" && slot) {
          writes.push((batch) => batch.delete(doc(getFirebaseDb(), "availableSlots", id)));
          closed++;
        }
      }
    }
    const summary = `Apply ${source.length} time(s) to ${targets.length} date(s) using ${applyMode === "merge" ? "merge" : "replace"}? ${opened} slots will open, ${closed} will close, and ${preserved.size} booked slots will be preserved.`;
    if (!window.confirm(summary)) return;
    setLoading(true); setFeedback("");
    try {
      await commitWrites(writes);
      setFeedback(`Updated availability across ${targets.length} days (${opened} slots opened, ${closed} closed, ${preserved.size} booked slots preserved).`);
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not apply this schedule."); }
    finally { setLoading(false); }
  }

  const toggleDay = (day: number) => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  const controlClass = "mt-1 block h-10 rounded-sm border border-input bg-background px-3 text-sm [color-scheme:light]";

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
          <label className="text-sm">Open a time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={controlClass} /></label>
          <button type="button" onClick={() => void addSlot()} disabled={loading || !ready} className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"><Plus className="size-4" />Make available</button>
        </div>
        <section className="rounded-sm border border-border p-4">
          <h3 className="font-display text-lg">Select Time Range</h3><p className="mt-1 text-xs text-muted-foreground">The end time marks the first time that is excluded from the range.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">Start time<input type="time" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} className={controlClass} /></label>
            <label className="text-sm">End time<input type="time" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} className={controlClass} /></label>
            <label className="text-sm">Slot interval<select value={interval} onChange={(event) => setInterval(Number(event.target.value))} className={controlClass}><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label>
            <button type="button" disabled={loading || !ready || !rangeTimes.length} onClick={() => void applySingleDayRange("open")} className="h-10 rounded-sm bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">Open Range</button>
            <button type="button" disabled={loading || !ready || !rangeTimes.length} onClick={() => void applySingleDayRange("close")} className="h-10 rounded-sm border border-border px-4 text-sm disabled:opacity-50">Close Range</button>
          </div>
          {rangeTimes.length === 0 && <p className="mt-3 text-sm text-destructive">End time must be after start time.</p>}
        </section>

        <section className="rounded-sm border border-border p-4">
          <div className="flex items-center gap-2"><Copy className="size-4 text-gold" /><h3 className="font-display text-lg">Copy / Bulk Apply Schedule</h3></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Copy from<select value={copySource} onChange={(event) => setCopySource(event.target.value as typeof copySource)} className={`${controlClass} w-full`}><option value="open-slots">Current day’s open slots</option><option value="time-range">Selected time range</option></select></label>
            <label className="text-sm">When applying<select value={applyMode} onChange={(event) => setApplyMode(event.target.value as ApplyMode)} className={`${controlClass} w-full`}><option value="merge">Merge with existing open slots</option><option value="replace">Replace unbooked slots for target days</option></select></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={targetMethod === "dates"} onChange={() => setTargetMethod("dates")} />Choose dates</label>
            <label className="flex items-center gap-2"><input type="radio" checked={targetMethod === "range"} onChange={() => setTargetMethod("range")} />Date range</label>
          </div>
          {targetMethod === "dates" ? <div className="mt-3 rounded-sm border border-border p-2"><p className="mb-2 px-2 text-xs text-muted-foreground">Select one or more target days. Active date is skipped.</p><Calendar mode="multiple" selected={targetDates} onSelect={(dates) => setTargetDates(dates ?? [])} /></div> : <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-3"><label className="text-sm">From date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={controlClass} /></label><label className="text-sm">To date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={controlClass} /></label></div>
            <fieldset><legend className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Weekdays</legend><div className="mt-2 flex flex-wrap gap-3">{weekdays.map((label, day) => <label key={label} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={days.includes(day)} onChange={() => toggleDay(day)} />{label}</label>)}</div></fieldset>
          </div>}
          <button type="button" disabled={loading || !ready} onClick={() => void applySchedule()} className="mt-4 h-10 rounded-sm bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">{loading ? "Applying schedule…" : "Review & Apply Schedule"}</button>
        </section>

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
