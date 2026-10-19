import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { WebsiteSettingsProvider, useWebsiteSettings } from "@/lib/website-settings";

export type LegalSection = { title: string; paragraphs: string[]; bullets?: string[] };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return <WebsiteSettingsProvider><LegalPageContent title={title} intro={intro} sections={sections} /></WebsiteSettingsProvider>;
}

function LegalPageContent({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  const settings = useWebsiteSettings();
  return <main className="min-h-screen bg-background text-foreground">
    <Navbar />
    <article className="mx-auto max-w-4xl px-5 pb-20 pt-32 sm:px-8 sm:pt-40">
      <p className="eyebrow text-gold">{settings.brandName}</p>
      <h1 className="display mt-4 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground">{intro}</p>
      <p className="mt-4 text-sm text-muted-foreground">Last updated: October 19, 2026</p>
      <div className="mt-10 space-y-8">
        {sections.map((section) => <section key={section.title}>
          <h2 className="font-display text-2xl">{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 leading-relaxed text-foreground/80">{paragraph}</p>)}
          {section.bullets && <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-foreground/80">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
        </section>)}
      </div>
      <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">Questions? Contact <a className="text-gold underline underline-offset-4" href={`mailto:${settings.companyEmail}`}>{settings.companyEmail}</a>.</p>
    </article>
    <Footer />
  </main>;
}
