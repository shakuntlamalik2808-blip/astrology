import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { updateProfile, verifyBeforeUpdateEmail } from "firebase/auth";
import { doc, getDoc, onSnapshot, query, collection, where, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useCustomerAuth, type CustomerMember } from "@/lib/customer-auth";
import { calculateBirthdayValidity, customerConsultationStatusLabel, formatDate, formatTime, normalizeConsultationStatus, type Consultation } from "@/lib/consultations";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

const blankMember: Omit<CustomerMember, "id"> = { name: "", relationship: "Other", dateOfBirth: "", timeOfBirth: "", placeOfBirth: "", notes: "" };
const relationships = ["Spouse", "Child", "Parent", "Friend", "Other"] as const;
const inputClass = "mt-2 min-h-11 w-full rounded-sm border border-ivory/20 bg-ink/60 px-3 text-base text-ivory focus:border-gold focus:outline-none [color-scheme:dark]";
type ProfileForm = { name: string; email: string; phone: string; dateOfBirth: string; timeOfBirth: string; placeOfBirth: string; gender: string };
const emptyProfile: ProfileForm = { name: "", email: "", phone: "", dateOfBirth: "", timeOfBirth: "", placeOfBirth: "", gender: "" };

function ProfilePage() {
  const { user, loading } = useCustomerAuth();
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [members, setMembers] = useState<CustomerMember[]>([]);
  const [items, setItems] = useState<Consultation[]>([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberDraft, setMemberDraft] = useState<Omit<CustomerMember, "id">>(blankMember);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getDoc(doc(getFirebaseDb(), "customers", user.uid)).then((snapshot) => {
      if (!active) return;
      const data = snapshot.data() ?? {};
      const birth = data.birthDetails ?? {};
      setProfile({ name: data.name || user.displayName || "", email: data.email || user.email || "", phone: data.phone || "", dateOfBirth: birth.dateOfBirth || "", timeOfBirth: birth.timeOfBirth || "", placeOfBirth: birth.placeOfBirth || "", gender: data.gender || "" });
      setMembers(Array.isArray(data.members) ? data.members as CustomerMember[] : []);
    }).catch(() => setError("Your profile could not be loaded."));
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(getFirebaseDb(), "consultations"), where("userId", "==", user.uid)), (snapshot) => {
      setItems(snapshot.docs.map((item) => item.data() as Consultation).sort((a, b) => (b.preferredDate || "").localeCompare(a.preferredDate || "")));
    }, () => setError("Consultation history could not be loaded."));
  }, [user]);

  const visibleItems = useMemo(() => items.filter((item) => selectedMember === "all" || (item.memberId || "self") === selectedMember), [items, selectedMember]);
  const setProfileField = (key: keyof ProfileForm, value: string) => setProfile((current) => ({ ...current, [key]: value }));

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await updateProfile(user, { displayName: profile.name.trim() });
      const changedEmail = profile.email.trim().toLowerCase() !== (user.email || "").toLowerCase();
      if (changedEmail) await verifyBeforeUpdateEmail(user, profile.email.trim());
      await setDoc(doc(getFirebaseDb(), "customers", user.uid), {
        uid: user.uid, name: profile.name.trim(), email: user.email || "", phone: profile.phone.trim(), gender: profile.gender,
        birthDetails: { dateOfBirth: profile.dateOfBirth, timeOfBirth: profile.timeOfBirth, placeOfBirth: profile.placeOfBirth },
        members, updatedAt: serverTimestamp(),
      }, { merge: true });
      setNotice(changedEmail ? "Profile saved. Verify the email sent to your new address to complete the email change." : "Profile saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Profile could not be saved."); }
    finally { setBusy(false); }
  }

  async function persistMembers(next: CustomerMember[]) {
    if (!user) return;
    await setDoc(doc(getFirebaseDb(), "customers", user.uid), { uid: user.uid, members: next, updatedAt: serverTimestamp() }, { merge: true });
    setMembers(next);
  }

  async function saveMember(event: FormEvent) {
    event.preventDefault();
    if (!user || busy) return;
    if (memberDraft.name.trim().length < 2 || !memberDraft.dateOfBirth || memberDraft.placeOfBirth.trim().length < 2) {
      setError("Enter the member’s name, date of birth, and place of birth."); return;
    }
    setBusy(true); setError(""); setNotice("");
    const id = editingId || crypto.randomUUID();
    const next = editingId ? members.map((member) => member.id === editingId ? { ...memberDraft, id } as CustomerMember : member) : [...members, { ...memberDraft, id } as CustomerMember];
    try { await persistMembers(next); setEditingId(null); setMemberDraft(blankMember); setNotice("Family or friend profile saved."); }
    catch { setError("The family or friend profile could not be saved."); }
    finally { setBusy(false); }
  }

  async function removeMember(id: string) {
    if (busy || !window.confirm("Remove this saved profile? Existing consultations will remain in your history.")) return;
    setBusy(true); setError("");
    try { await persistMembers(members.filter((member) => member.id !== id)); setNotice("Profile removed. Existing consultation history is preserved."); }
    catch { setError("The profile could not be removed."); }
    finally { setBusy(false); }
  }

  function validity(item: Consultation) {
    const validFrom = item.validFrom || item.preferredDate;
    let validUntil = item.validUntil;
    try { if (!validUntil) validUntil = calculateBirthdayValidity(item.dateOfBirth, validFrom).validUntil; } catch { /* Older malformed records may not have a usable date. */ }
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (!validUntil) return { label: "Validity date unavailable", active: false };
    if (today < validFrom) return { label: `Upcoming · valid from ${formatDate(validFrom)}`, active: true };
    if (today <= validUntil) return { label: `Active · valid till upcoming birthday: ${formatDate(validUntil)}`, active: true };
    return { label: "Expired · due for new birthday year consultation", active: false };
  }

  function downloadRemedy(item: Consultation) {
    if (item.remedyPdfUrl) { window.open(item.remedyPdfUrl, "_blank", "noopener,noreferrer"); return; }
    const content = item.remedyLanguage === "English" ? item.remediesEnglish : item.remediesHindi || item.remediesEnglish;
    if (!content) return;
    const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
    const page = window.open("", "_blank");
    if (!page) return;
    page.document.write(`<!doctype html><html lang="${item.remedyLanguage === "English" ? "en" : "hi"}"><meta charset="utf-8"><title>Remedies ${escape(item.consultationId)}</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600&display=swap');body{font:16px 'Noto Sans Devanagari',sans-serif;color:#202633;max-width:760px;margin:48px auto;padding:32px}.brand{color:#9a7937;letter-spacing:2px;border-bottom:1px solid #c9ad70;padding-bottom:14px}.meta{line-height:2;margin:24px 0;border-bottom:1px solid #ddd;padding-bottom:16px}li{padding:0 0 10px;line-height:1.8}button{margin:16px 0;padding:12px 18px}@media print{button{display:none}body{margin:0}}</style><div class="brand">Shakuntla Malik · Jyotish, Counseling & Astrology Academy</div><h1>${item.remedyLanguage === "English" ? "Remedies & Guidance" : "ज्योतिषीय उपाय एवं मार्गदर्शन"}</h1><div class="meta">Reference: ${escape(item.consultationId)}<br>For: ${escape(item.memberName || item.fullName)}<br>Appointment: ${escape(formatDate(item.preferredDate))} · ${escape(formatTime(item.preferredTime))}<br>Valid till: ${escape(formatDate(item.validUntil))}</div><ol>${content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `<li>${escape(line)}</li>`).join("")}</ol><button onclick="window.print()">Print / Save PDF</button><script>window.onload=()=>document.fonts.ready</script></html>`);
    page.document.close();
  }

  if (loading) return <main className="surface-night min-h-screen text-ivory"><Navbar /><p className="mx-auto max-w-4xl px-4 pt-40">Loading your account…</p><Footer /></main>;
  if (!user) return <main className="surface-night min-h-screen text-ivory"><Navbar /><section className="mx-auto max-w-4xl px-4 pb-20 pt-40"><h1 className="display text-4xl">Your profile</h1><p className="mt-4 text-ivory/70">Sign in to manage your details, family profiles, consultations, and remedies.</p><Link to="/sign-in" className="mt-6 inline-block rounded-sm bg-gold px-6 py-3 text-sm uppercase tracking-wider text-ink">Sign in</Link></section><Footer /></main>;

  return <main className="surface-night min-h-screen text-ivory"><Navbar /><section className="mx-auto max-w-5xl px-4 pb-20 pt-36 sm:px-6">
    <p className="eyebrow text-gold">Customer account</p><h1 className="display mt-3 text-4xl sm:text-5xl">Your profile</h1><p className="mt-3 text-ivory/60">Manage your details and the people you book consultations for.</p>
    {error && <p role="alert" className="mt-5 rounded-sm border border-terracotta/50 p-3 text-sm text-gold-soft">{error}</p>}{notice && <p role="status" className="mt-5 rounded-sm border border-gold/30 p-3 text-sm text-gold-soft">{notice}</p>}
    <form onSubmit={saveProfile} className="mt-8 rounded-sm border border-ivory/15 bg-ink-soft/60 p-5 sm:p-7"><h2 className="font-display text-2xl text-gold-soft">Your details</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Full name<input required minLength={2} value={profile.name} onChange={(event) => setProfileField("name", event.target.value)} className={inputClass} /></label>
      <label className="text-sm">Email address<input required type="email" value={profile.email} onChange={(event) => setProfileField("email", event.target.value)} className={inputClass} /></label>
      <label className="text-sm">Phone number<input type="tel" value={profile.phone} onChange={(event) => setProfileField("phone", event.target.value)} className={inputClass} /></label>
      <label className="text-sm">Gender<select value={profile.gender} onChange={(event) => setProfileField("gender", event.target.value)} className={inputClass}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></label>
      <label className="text-sm">Date of birth<input type="date" value={profile.dateOfBirth} onChange={(event) => setProfileField("dateOfBirth", event.target.value)} className={inputClass} /></label>
      <label className="text-sm">Time of birth<input type="time" value={profile.timeOfBirth} onChange={(event) => setProfileField("timeOfBirth", event.target.value)} className={inputClass} /></label>
      <label className="text-sm sm:col-span-2">Place of birth<input value={profile.placeOfBirth} onChange={(event) => setProfileField("placeOfBirth", event.target.value)} className={inputClass} /></label>
    </div><button disabled={busy} className="mt-5 min-h-11 rounded-sm bg-gold px-5 text-sm font-medium uppercase tracking-wider text-ink disabled:opacity-60">{busy ? "Saving…" : "Save profile"}</button></form>

    <section className="mt-8 rounded-sm border border-ivory/15 bg-ink-soft/60 p-5 sm:p-7"><h2 className="font-display text-2xl text-gold-soft">Family & friends</h2><p className="mt-2 text-sm text-ivory/55">Save birth details once, then choose this person when booking.</p>
      {members.map((member) => <article key={member.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-ivory/10 pb-4"><div><h3 className="font-medium">{member.name} <span className="text-sm text-gold">· {member.relationship}</span></h3><p className="mt-1 text-xs text-ivory/55">{formatDate(member.dateOfBirth)} · {member.placeOfBirth}</p></div><div className="flex gap-3 text-sm"><button type="button" onClick={() => { setEditingId(member.id); setMemberDraft({ name: member.name, relationship: member.relationship, dateOfBirth: member.dateOfBirth, timeOfBirth: member.timeOfBirth || "", placeOfBirth: member.placeOfBirth, notes: member.notes || "" }); }} className="text-gold underline">Edit</button><button type="button" disabled={busy} onClick={() => void removeMember(member.id)} className="text-ivory/60 underline">Remove</button></div></article>)}
      <form onSubmit={saveMember} className="mt-5 grid gap-4 sm:grid-cols-2"><h3 className="font-display text-xl text-gold-soft sm:col-span-2">{editingId ? "Edit profile" : "Add a family member or friend"}</h3>
        <label className="text-sm">Full name<input required value={memberDraft.name} onChange={(event) => setMemberDraft((draft) => ({ ...draft, name: event.target.value }))} className={inputClass} /></label>
        <label className="text-sm">Relationship<select value={memberDraft.relationship} onChange={(event) => setMemberDraft((draft) => ({ ...draft, relationship: event.target.value as CustomerMember["relationship"] }))} className={inputClass}>{relationships.map((relationship) => <option key={relationship}>{relationship}</option>)}</select></label>
        <label className="text-sm">Date of birth<input required type="date" value={memberDraft.dateOfBirth} onChange={(event) => setMemberDraft((draft) => ({ ...draft, dateOfBirth: event.target.value }))} className={inputClass} /></label>
        <label className="text-sm">Time of birth<input type="time" value={memberDraft.timeOfBirth} onChange={(event) => setMemberDraft((draft) => ({ ...draft, timeOfBirth: event.target.value }))} className={inputClass} /></label>
        <label className="text-sm">Place of birth<input required value={memberDraft.placeOfBirth} onChange={(event) => setMemberDraft((draft) => ({ ...draft, placeOfBirth: event.target.value }))} className={inputClass} /></label>
        <label className="text-sm">Notes (optional)<input value={memberDraft.notes} onChange={(event) => setMemberDraft((draft) => ({ ...draft, notes: event.target.value }))} className={inputClass} /></label>
        <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="min-h-11 rounded-sm border border-gold/60 px-5 text-sm text-gold disabled:opacity-60">{editingId ? "Save changes" : "Add profile"}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setMemberDraft(blankMember); }} className="text-sm text-ivory/60 underline">Cancel</button>}</div>
      </form>
    </section>

    <section className="mt-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-gold">Your history</p><h2 className="display mt-2 text-3xl">My Consultations & Remedies</h2></div><label className="text-xs uppercase tracking-wider text-ivory/55">Filter by person<select value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)} className="mt-2 block min-h-10 rounded-sm border border-ivory/20 bg-ink px-3 text-sm normal-case tracking-normal text-ivory"><option value="all">Everyone</option><option value="self">My consultations</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>
      {visibleItems.length === 0 ? <p className="mt-6 text-sm text-ivory/60">No consultations found for this profile.</p> : <div className="mt-6 grid gap-4">{visibleItems.map((item) => { const valid = validity(item); const memberId = item.memberId || "self"; const memberName = item.memberName || item.fullName; const relationship = item.relationship || "Self"; const remedies = item.remedyLanguage === "English" ? item.remediesEnglish || item.remediesHindi : item.remediesHindi || item.remediesEnglish; const consultationStatus = normalizeConsultationStatus(item.status, item.archived); return <article key={item.consultationId} className="rounded-sm border border-ivory/15 bg-ink-soft/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow text-gold">{item.consultationType}</p><h3 className="mt-2 font-display text-xl">{memberName} · {relationship}</h3><p className="mt-1 text-sm text-ivory/60">{formatDate(item.preferredDate)} at {formatTime(item.preferredTime)} · Ref {item.consultationId}</p></div><span className="rounded-full border border-ivory/25 px-3 py-1 text-xs">{customerConsultationStatusLabel(item.status, item.archived)}</span></div>
        <p className={`mt-4 text-sm ${consultationStatus === "Cancelled" ? "text-terracotta" : valid.active ? "text-gold-soft" : "text-terracotta"}`}>{consultationStatus === "Cancelled" ? "This consultation was cancelled." : valid.label}</p>
        {remedies && <div className="mt-5 rounded-sm border border-gold/20 bg-ink/50 p-4"><h4 className="font-display text-lg text-gold-soft">Remedies & guidance</h4><div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ivory/80">{remedies}</div><button type="button" onClick={() => downloadRemedy(item)} className="mt-4 text-sm text-gold underline">Download Remedies PDF</button></div>}
        {item.remedyPdfUrl && <a href={item.remedyPdfUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-gold underline">Open shared remedy PDF</a>}
        {(!valid.active || consultationStatus === "Cancelled") && <a href={`/book-consultation?memberId=${encodeURIComponent(memberId)}`} className="mt-4 inline-block rounded-sm bg-gold px-4 py-2 text-xs uppercase tracking-wider text-ink">Re-book consultation</a>}
      </article>; })}</div>}
    </section>
  </section><Footer /></main>;
}
