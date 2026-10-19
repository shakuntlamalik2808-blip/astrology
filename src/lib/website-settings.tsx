import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export type WebsiteService = { id: string; name: string; price: string; description: string };
export type WebsiteShort = { id: string; title: string; url: string };

export type WebsiteSettings = {
  practitionerName: any;
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
  services: WebsiteService[];
  packages: WebsiteService[];
  shorts: WebsiteShort[];
};

export const defaultWebsiteSettings: WebsiteSettings = {
  brandName: "Shakuntla Malik",
  heroTitle: "Guidance rooted in tradition and clarity.",
  heroSubtitle: "Astrology consultations for life decisions, home harmony, and spiritual clarity.",
  homepageDescription: "We help clients navigate relationships, career, health, and home life through spiritual guidance and practical astrology insight.",
  aboutContent: "Shakuntla Malik is an astrology practitioner helping people find clarity through Kundli analysis, vastu guidance, and spiritual counseling.",
  academyContent: "Learn the fundamentals of astrology, Vastu, and spiritual guidance through curated teaching resources and guided learning experiences.",
  bookingContent: "Book a consultation to receive personalized guidance for your life, relationships, and spiritual needs.",
  companyEmail: "astrology@studio.com",
  phone: "+91 98118 40795",
  whatsapp: "+91 98118 40795",
  address: "Faridabad, India",
  instagram: "https://instagram.com",
  youtube: "https://youtube.com",
  facebook: "https://facebook.com",
  logoUrl: "https://res.cloudinary.com/bmoob3fd/image/upload/v1791013386/StarsAndSutra_logo_mhknok.png",
  heroImageUrl: "https://res.cloudinary.com/bmoob3fd/image/upload/v1791019009/IMG_9072_u6hsup.png",
  serviceImageUrl: "https://res.cloudinary.com/bmoob3fd/image/upload/v1791019151/IMG_9369_kc6dnk.jpg",
  aboutImageUrl: "https://res.cloudinary.com/bmoob3fd/image/upload/v1791019098/IMG_9097_mxud7k.png",
  services: [
    { id: "kundli", name: "Single Kundli Consultation", price: "₹2100", description: "Birth chart analysis and guidance for important life decisions." },
    { id: "vastu", name: "Home Vastu", price: "₹50000", description: "Property and home alignment consultation for harmony and balance." },
    { id: "match-making", name: "Match Making", price: "₹2100", description: "Compatibility guidance based on astrological principles." },
  ],
  packages: [
    { id: "starter", name: "Starter Consultation", price: "₹2100", description: "A focused session for immediate guidance." },
    { id: "premium", name: "Premium Guidance", price: "₹5000", description: "Deeper guidance with detailed life insights." },
  ],
  shorts: [],
};

const WebsiteSettingsContext = createContext<WebsiteSettings>(defaultWebsiteSettings);

export function WebsiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultWebsiteSettings);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return onSnapshot(
      doc(getFirebaseDb(), "settings", "website"),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const saved = snapshot.data() as Partial<WebsiteSettings>;
        setSettings({
          ...defaultWebsiteSettings,
          ...saved,
          services: Array.isArray(saved.services) ? saved.services : defaultWebsiteSettings.services,
          packages: Array.isArray(saved.packages) ? saved.packages : defaultWebsiteSettings.packages,
          shorts: Array.isArray(saved.shorts) ? saved.shorts : defaultWebsiteSettings.shorts,
        });
      },
      (error) => console.error("Could not load public website settings:", error),
    );
  }, []);

  return <WebsiteSettingsContext.Provider value={settings}>{children}</WebsiteSettingsContext.Provider>;
}

export function useWebsiteSettings() {
  return useContext(WebsiteSettingsContext);
}
