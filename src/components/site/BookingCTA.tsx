import { Reveal, RevealWords } from "./Reveal";
import { MagneticButton } from "./MagneticButton";
import { Starfield } from "./Starfield";

export function BookingCTA() {
  return (
    <section id="book" className="surface-night section-rule grain relative overflow-hidden py-28 lg:py-40">
      <Starfield count={22} />
      <div className="animate-slow-spin pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[min(78vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/12" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <p className="eyebrow text-gold">Begin</p>
        </Reveal>
         <h2 className="display mt-8 text-[clamp(2.4rem,5.5vw,4.75rem)] text-ivory">
          <RevealWords text="Your chart can offer perspective. The next step is yours." />
        </h2>
        <Reveal delay={0.2}>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-4 text-ivory">
            <MagneticButton href="/book-consultation" variant="gold">
              Book a Consultation
            </MagneticButton>
            <MagneticButton href="#practice" variant="outline">
              Explore the Practice
            </MagneticButton>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
             <p className="mt-10 text-xs tracking-[0.16em] text-ivory/55 uppercase">
            Sessions are scheduled in your local timezone
          </p>
        </Reveal>
      </div>
    </section>
  );
}
