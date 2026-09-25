import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

type ServiceItem = {
  id: string;
  name: string;
  price: string;
  description: string;
};

type WebsiteSettings = {
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  homepageDescription: string;
  aboutContent: string;
  academyContent: string;
  bookingContent: string;
  companyEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  youtube: string;
  facebook: string;
  logoUrl: string;
  heroImageUrl: string;
  serviceImageUrl: string;
  aboutImageUrl: string;
  services: ServiceItem[];
  packages: ServiceItem[];
};

const SETTINGS_DOCUMENT = ["settings", "website"] as const;

const defaultSettings: WebsiteSettings = {
  brandName: "Shakuntla Malik",
  heroTitle: "Guidance rooted in tradition and clarity.",
  heroSubtitle: "Astrology consultations for life decisions, home harmony, and spiritual clarity.",
  homepageDescription:
    "We help clients navigate relationships, career, health, and home life through spiritual guidance and practical astrology insight.",
  aboutContent:
    "Shakuntla Malik is an astrology practitioner helping people find clarity through Kundli analysis, vastu guidance, and spiritual counseling.",
  academyContent:
    "Learn the fundamentals of astrology, Vastu, and spiritual guidance through curated teaching resources and guided learning experiences.",
  bookingContent:
    "Book a consultation to receive personalized guidance for your life, relationships, and spiritual needs.",
  companyEmail: "astrology@studio.com",
  phone: "+91 98118 40795",
  whatsapp: "+91 98118 40795",
  address: "Faridabad, India",
  instagram: "https://instagram.com",
  youtube: "https://youtube.com",
  facebook: "https://facebook.com",
  logoUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80",
  heroImageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
  serviceImageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=80",
  aboutImageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  services: [
    { id: "kundli", name: "Single Kundli Consultation", price: "₹2100", description: "Birth chart analysis and guidance for important life decisions." },
    { id: "vastu", name: "Home Vastu", price: "₹50000", description: "Property and home alignment consultation for harmony and balance." },
    { id: "match-making", name: "Match Making", price: "₹2100", description: "Compatibility guidance based on astrological principles." },
  ],
  packages: [
    { id: "starter", name: "Starter Consultation", price: "₹2100", description: "A focused session for immediate guidance." },
    { id: "premium", name: "Premium Guidance", price: "₹5000", description: "Deeper guidance with detailed life insights." },
  ],
};

export const Route = createFileRoute("/admin/settings")({
  component: WebsiteSettingsPage,
});

function WebsiteSettingsPage() {
  const [settings, setSettings] = useState<WebsiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      if (!isFirebaseConfigured()) {
        if (active) {
          setFeedback({ type: "error", message: "Firebase is not configured. Add the VITE_FIREBASE_* settings to load and save website settings." });
          setLoading(false);
        }
        return;
      }
      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), ...SETTINGS_DOCUMENT));
        if (active && snapshot.exists()) {
          const saved = snapshot.data() as Partial<WebsiteSettings>;
          setSettings({ ...defaultSettings, ...saved, services: saved.services ?? defaultSettings.services, packages: saved.packages ?? defaultSettings.packages });
        }
      } catch (error) {
        if (active) setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not load website settings from Firestore." });
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadSettings();
    return () => { active = false; };
  }, []);

  const updateField = <K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateService = (index: number, field: keyof ServiceItem, value: string) => {
    setSettings((prev) => ({
      ...prev,
      services: prev.services.map((service, i) => (i === index ? { ...service, [field]: value } : service)),
    }));
  };

  const updatePackage = (index: number, field: keyof ServiceItem, value: string) => {
    setSettings((prev) => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => (i === index ? { ...pkg, [field]: value } : pkg)),
    }));
  };

  const saveChanges = async () => {
    if (!isFirebaseConfigured()) {
      setFeedback({ type: "error", message: "Firebase is not configured. Website settings were not saved." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await setDoc(doc(getFirebaseDb(), ...SETTINGS_DOCUMENT), { ...settings, updatedAt: serverTimestamp() });
      setFeedback({ type: "success", message: "Website settings saved." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not save website settings." });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    setFeedback({ type: "success", message: "Defaults loaded. Save Changes to write them to Firestore." });
  };

  return (
    <div className="space-y-6 text-[#181512]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-gold">CMS</p>
          <h1 className="display mt-2 text-3xl text-[#171512]">Website Settings</h1>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-sm border border-[#d7c2a6] bg-[#f7f2e8] p-5 text-[#171512] shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl text-[#171512]">General Settings</h2>
            <div className="flex gap-2">
              <button type="button" onClick={resetSettings} className="inline-flex items-center gap-2 rounded-sm border border-[#d7c2a6] bg-white/70 px-3 py-2 text-sm text-[#1f1d1a] hover:border-[#c79f5b] hover:text-[#1a1715]">
                <RotateCcw className="size-4" /> Reset
              </button>
              <button type="button" onClick={() => void saveChanges()} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-sm bg-[#d4ad6d] px-3 py-2 text-sm font-medium text-[#1a1715] hover:bg-[#c79f5b] disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="size-4" /> {saving ? "Saving…" : loading ? "Loading…" : "Save Changes"}
              </button>
            </div>
          </div>
          {feedback && <p role="status" className={`mb-4 text-sm ${feedback.type === "error" ? "text-red-700" : "text-green-800"}`}>{feedback.message}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Brand / Company Name">
              <input value={settings.brandName} onChange={(e) => updateField("brandName", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Email">
              <input value={settings.companyEmail} onChange={(e) => updateField("companyEmail", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Phone">
              <input value={settings.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="WhatsApp Number">
              <input value={settings.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Address">
              <input value={settings.address} onChange={(e) => updateField("address", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b] md:col-span-2" />
            </Field>
          </div>
        </section>

        <section className="rounded-sm border border-[#d7c2a6] bg-[#f7f2e8] p-5 text-[#171512] shadow-sm">
          <h2 className="font-display text-xl text-[#171512]">Pricing & Services</h2>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hero Title">
                <input value={settings.heroTitle} onChange={(e) => updateField("heroTitle", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
              </Field>
              <Field label="Hero Subtitle">
                <input value={settings.heroSubtitle} onChange={(e) => updateField("heroSubtitle", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
              </Field>
            </div>

            <Field label="Homepage Description">
              <textarea value={settings.homepageDescription} onChange={(e) => updateField("homepageDescription", e.target.value)} rows={4} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2f2b28]">Main Services</p>
              {settings.services.map((service, index) => (
                <div key={service.id} className="grid gap-3 rounded-sm border border-[#d7c2a6] bg-[#f3ebdd] p-3 md:grid-cols-[1.2fr_0.5fr_1.5fr]">
                  <input value={service.name} onChange={(e) => updateService(index, "name", e.target.value)} className="rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
                  <input value={service.price} onChange={(e) => updateService(index, "price", e.target.value)} className="rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
                  <input value={service.description} onChange={(e) => updateService(index, "description", e.target.value)} className="rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2f2b28]">Packages</p>
              {settings.packages.map((pkg, index) => (
                <div key={pkg.id} className="grid gap-3 rounded-sm border border-[#d7c2a6] bg-[#f3ebdd] p-3 md:grid-cols-[1.2fr_0.5fr_1.5fr]">
                  <input value={pkg.name} onChange={(e) => updatePackage(index, "name", e.target.value)} className="rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
                  <input value={pkg.price} onChange={(e) => updatePackage(index, "price", e.target.value)} className="rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
                  <input value={pkg.description} onChange={(e) => updatePackage(index, "description", e.target.value)} className="rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-[#d7c2a6] bg-[#f7f2e8] p-5 text-[#171512] shadow-sm">
          <h2 className="font-display text-xl text-[#171512]">Content Pages</h2>
          <div className="mt-4 grid gap-4">
            <Field label="About Page Content">
              <textarea value={settings.aboutContent} onChange={(e) => updateField("aboutContent", e.target.value)} rows={5} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Academy Page Content">
              <textarea value={settings.academyContent} onChange={(e) => updateField("academyContent", e.target.value)} rows={5} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Booking Page Content">
              <textarea value={settings.bookingContent} onChange={(e) => updateField("bookingContent", e.target.value)} rows={5} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
          </div>
        </section>

        <section className="rounded-sm border border-[#d7c2a6] bg-[#f7f2e8] p-5 text-[#171512] shadow-sm">
          <h2 className="font-display text-xl text-[#171512]">Media & Branding</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Logo URL">
              <input value={settings.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Hero Image URL">
              <input value={settings.heroImageUrl} onChange={(e) => updateField("heroImageUrl", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Service Image URL">
              <input value={settings.serviceImageUrl} onChange={(e) => updateField("serviceImageUrl", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="About Image URL">
              <input value={settings.aboutImageUrl} onChange={(e) => updateField("aboutImageUrl", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
          </div>
        </section>

        <section className="rounded-sm border border-[#d7c2a6] bg-[#f7f2e8] p-5 text-[#171512] shadow-sm">
          <h2 className="font-display text-xl text-[#171512]">Contact & Social Links</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Instagram URL">
              <input value={settings.instagram} onChange={(e) => updateField("instagram", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="YouTube URL">
              <input value={settings.youtube} onChange={(e) => updateField("youtube", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b]" />
            </Field>
            <Field label="Facebook URL">
              <input value={settings.facebook} onChange={(e) => updateField("facebook", e.target.value)} className="w-full rounded-sm border border-[#d7c2a6] bg-white/80 px-3 py-2.5 text-sm text-[#171512] outline-none placeholder:text-[#6d655f] focus:border-[#c79f5b] lg:col-span-2" />
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-[#1f1d1a]">
      <span className="mb-2 block text-sm font-medium text-[#1f1d1a]">{label}</span>
      {children}
    </label>
  );
}
