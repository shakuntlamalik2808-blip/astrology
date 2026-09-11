import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Biography of Shakuntla Malik — counseling psychology, North Indian Jyotish, and Lal Kitab.",
};

export default function AboutPage() {
  return (
    <article className="container max-w-3xl py-16 md:py-24">
      <p className="text-xs uppercase tracking-[0.28em] text-gold-dark">The practitioner</p>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl">Shakuntla Malik</h1>
      <div className="gold-rule mt-6" />
      <p className="mt-8 text-lg text-muted-foreground">
        A Faridabad-based consulting astrologer whose work sits at the intersection of counseling psychology and
        classical North Indian Jyotish. Clients come for charts; they stay because the conversation is precise, calm,
        and accountable.
      </p>
      <div className="prose prose-slate mt-10 max-w-none dark:prose-invert">
        <h2 className="font-serif text-2xl">Counseling as method</h2>
        <p className="mt-3 leading-relaxed text-foreground/80">
          Formal training in counseling psychology shapes how a session unfolds: informed consent, clear scope, and
          language that never outsources a client’s agency to a planet. Astrology here is a timing and pattern lens —
          not a verdict.
        </p>
        <h2 className="mt-10 font-serif text-2xl">North Indian chart interpretation</h2>
        <p className="mt-3 leading-relaxed text-foreground/80">
          Readings use the diamond-style North Indian chart, with attention to house lords, yogas, Navamsa, and
          Vimshottari dasha sequence. The aim is a usable map: what is ripening now, what can wait, and where effort
          is likely to compound.
        </p>
        <h2 className="mt-10 font-serif text-2xl">Lal Kitab principles</h2>
        <p className="mt-3 leading-relaxed text-foreground/80">
          Lal Kitab is taught and applied as a system of planetary debts and household-level corrections — modest,
          ethical, and never sold as magic. Remedies are framed as experiments a client can evaluate, not as
          obligations.
        </p>
        <h2 className="mt-10 font-serif text-2xl">Practice notes</h2>
        <p className="mt-3 leading-relaxed text-foreground/80">
          The studio is in Faridabad. Video sessions run across IST, European, and American timezones. Work includes
          single Kundli consultations, day-to-day counseling retainers, Vastu audits, birth-time rectification, and
          the Academy for serious students.
        </p>
      </div>
    </article>
  );
}
