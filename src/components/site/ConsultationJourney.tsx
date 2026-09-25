import { Reveal } from "./Reveal";

const steps = [
  { n: "01", title: "Book", body: "Choose your consultation and a time that works in your timezone." },
  { n: "02", title: "Share", body: "Provide the birth details and context required for the chart reading." },
  { n: "03", title: "Consult", body: "A focused one-to-one session — questions welcome throughout." },
  { n: "04", title: "Leave With Clarity", body: "Practical insight, honest timing and clear next steps." },
];

export function ConsultationJourney() {
  return (
    <section className="editorial-section relative border-y border-border bg-secondary/45">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-12">
        <Reveal>
          <p className="eyebrow text-terracotta">The Experience</p>
          <h2 className="display mt-6 max-w-2xl text-[clamp(2.3rem,5vw,4.25rem)]">
            How a consultation unfolds.
          </h2>
        </Reveal>

        <ol className="mt-16 grid border-t border-border lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.1}>
               <div className="group relative h-full border-b border-border bg-background/40 p-8 transition-colors duration-200 hover:bg-background lg:border-r lg:p-9">
                 <span className="absolute top-0 left-0 h-px w-0 bg-gold transition-all duration-300 group-hover:w-full" />
                 <span className="display block text-4xl text-gold/70 transition-colors duration-200 group-hover:text-gold">
                  {s.n}
                </span>
                <h3 className="display mt-8 text-2xl">{s.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
