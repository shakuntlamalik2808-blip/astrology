import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Plus, Save, Trash2 } from "lucide-react";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { WebsiteShort } from "@/lib/website-settings";

export const Route = createFileRoute("/admin/reels")({ component: ReelsAdmin });

function validYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname) && Boolean(videoIdFromUrl(value));
  } catch { return false; }
}

function videoIdFromUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.endsWith("youtu.be")) return url.pathname.split("/").filter(Boolean)[0];
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const path = url.pathname.split("/").filter(Boolean);
    const marker = path.findIndex((part) => part === "shorts" || part === "embed");
    return marker >= 0 ? path[marker + 1] : null;
  } catch { return null; }
}

function ReelsAdmin() {
  const [shorts, setShorts] = useState<WebsiteShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!isFirebaseConfigured()) { setFeedback("Firebase is not configured."); setLoading(false); return; }
      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), "settings", "website"));
        if (active && snapshot.exists()) {
          const saved = snapshot.data().shorts;
          if (Array.isArray(saved)) setShorts(saved as WebsiteShort[]);
        }
      } catch (error) { if (active) setFeedback(error instanceof Error ? error.message : "Could not load Shorts."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const save = async () => {
    if (shorts.some((short) => !short.title.trim() || !validYouTubeUrl(short.url))) {
      setFeedback("Each Short needs a title and a valid YouTube video URL."); return;
    }
    setSaving(true); setFeedback("");
    try {
      await setDoc(doc(getFirebaseDb(), "settings", "website"), { shorts, updatedAt: serverTimestamp() }, { merge: true });
      setFeedback("YouTube Shorts saved. The homepage will update shortly.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Could not save Shorts."); }
    finally { setSaving(false); }
  };

  const update = (id: string, field: "title" | "url", value: string) => setShorts((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const add = () => setShorts((items) => [...items, { id: crypto.randomUUID(), title: "", url: "" }]);

  return <div className="max-w-4xl space-y-6 text-[#181512]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow text-gold">CMS</p><h1 className="display mt-2 text-3xl text-[#171512]">YouTube Shorts</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Add Shorts URLs to feature them on the homepage. Items appear in this order.</p></div>
      <button type="button" onClick={() => void save()} disabled={saving || loading} className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#d4ad6d] px-4 py-2.5 text-sm font-medium text-[#1a1715] disabled:opacity-60"><Save className="size-4" />{saving ? "Saving…" : "Save Shorts"}</button></div>
    {feedback && <p role="status" className="text-sm">{feedback}</p>}
    <div className="space-y-3">
      {shorts.map((short, index) => <div key={short.id} className="grid gap-3 rounded-sm border border-[#d7c2a6] bg-[#f7f2e8] p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <label className="text-sm">Title<input value={short.title} onChange={(e) => update(short.id, "title", e.target.value)} placeholder={`Short ${index + 1}`} className="mt-2 w-full rounded-sm border border-[#d7c2a6] bg-white px-3 py-2 text-sm" /></label>
        <label className="text-sm">YouTube Short URL<input value={short.url} onChange={(e) => update(short.id, "url", e.target.value)} placeholder="https://www.youtube.com/shorts/..." className="mt-2 w-full rounded-sm border border-[#d7c2a6] bg-white px-3 py-2 text-sm" /></label>
        <button type="button" aria-label={`Remove ${short.title || `Short ${index + 1}`}`} onClick={() => setShorts((items) => items.filter((item) => item.id !== short.id))} className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[#d7c2a6] px-3 text-sm hover:border-red-400 hover:text-red-700"><Trash2 className="size-4" /><span className="sm:hidden">Remove</span></button>
      </div>)}
      {loading && <p className="text-sm text-muted-foreground">Loading Shorts…</p>}
      {!loading && shorts.length === 0 && <p className="rounded-sm border border-dashed border-[#d7c2a6] p-8 text-center text-sm text-muted-foreground">No Shorts added yet.</p>}
    </div>
    <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-sm border border-[#c79f5b] px-4 py-2.5 text-sm hover:bg-[#f7f2e8]"><Plus className="size-4" />Add a Short</button>
  </div>;
}
