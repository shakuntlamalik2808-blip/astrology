import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { Philosophy } from "@/components/site/Philosophy";
import { PracticePillars } from "@/components/site/PracticePillars";
import { Services } from "@/components/site/Services";
import { ConsultationJourney } from "@/components/site/ConsultationJourney";
import { About } from "@/components/site/About";
import { Academy } from "@/components/site/Academy";
import { Trust } from "@/components/site/Trust";
import { BookingCTA } from "@/components/site/BookingCTA";
import { Footer } from "@/components/site/Footer";
import { WebsiteSettingsProvider } from "@/lib/website-settings";

const title = "Shakuntla Malik — Jyotish, Counseling & Astrology Academy";
const description =
  "Astrology as a counseling practice: Kundli consultations, Home Vastu, Match Making and a Jyotish academy. Based in Faridabad, serving clients worldwide.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <WebsiteSettingsProvider><main className="relative">
      <Navbar />
      <Hero />
      <Philosophy />
      <PracticePillars />
      <Services />
      <ConsultationJourney />
      <div className="defer-render"><About /></div>
      <div className="defer-render"><Academy /></div>
      <div className="defer-render"><Trust /></div>
      <div className="defer-render"><BookingCTA /></div>
      <div className="defer-render"><Footer /></div>
    </main></WebsiteSettingsProvider>
  );
}
