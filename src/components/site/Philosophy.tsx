import { Reveal, RevealWords } from "./Reveal";

const points = [
  "Insight before prediction",
  "Self-understanding",
  "Timing and readiness",
  "Practical decision-making",
  "Ethical, doable remedies",
  "Counseling-led conversation",
];

export function Philosophy() {
  return (
    <section id="practice" className="editorial-section relative overflow-hidden bg-background">
      <div className="relative mx-auto grid max-w-[88rem] gap-16 px-6 lg:grid-cols-12 lg:px-12">
        <div className="lg:col-span-6">
          <Reveal>
            <p className="eyebrow text-terracotta">The Philosophy</p>
          </Reveal>
           <h2 className="display mt-7 text-[clamp(2.5rem,5.2vw,4.5rem)]">
            <RevealWords text="Astrology, without the fear." />
          </h2>
          <Reveal delay={0.15}>
             <div className="mt-10 flex items-start gap-5 border-l border-gold/50 pl-6">
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                A chart is a map of tendencies and timing — not a verdict. The work is to read it
                honestly and translate it into something you can act on.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:pt-20">
          <Reveal delay={0.1}>
            <p className="text-xl leading-relaxed text-foreground/85 lg:text-2xl">
              Every consultation begins as a conversation. Counseling psychology shapes how the
              reading is delivered; Jyotish and Lal Kitab shape what is read. The result is
              guidance you can weigh, question and use.
            </p>
          </Reveal>

           <ul className="mt-12 grid border-t border-border sm:grid-cols-2">
            {points.map((p, i) => (
               <Reveal as="li" key={p} delay={0.05 * i} className="border-b border-border sm:odd:border-r">
                 <div className="group flex items-center gap-4 px-6 py-6 transition-colors duration-200 hover:bg-secondary/60">
                  <span className="font-display text-sm text-gold tabular-nums">
                    0{i + 1}
                  </span>
                   <span className="text-sm text-foreground/80 transition-transform duration-200 group-hover:translate-x-1">
                    {p}
                  </span>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
