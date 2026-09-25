import { Reveal } from "./Reveal";

const slots = [
  "Client reflection — to be added",
  "Client reflection — to be added",
  "Client reflection — to be added",
];

export function Testimonials() {
  return (
    <section className="bg-background py-28 lg:py-36">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-12">
        <Reveal>
          <p className="eyebrow text-terracotta">In Their Words</p>
          <h2 className="display mt-6 max-w-2xl text-[clamp(2.1rem,4.4vw,3.5rem)]">
            Reflections from consultations.
          </h2>
          <p className="mt-6 max-w-lg text-sm text-muted-foreground">
            Placeholder slots — real client reflections can be added here once shared and
            approved.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-px bg-border md:grid-cols-3">
          {slots.map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <figure className="flex h-full flex-col justify-between bg-card p-8 lg:p-10">
                <span className="display text-5xl leading-none text-gold/50">&ldquo;</span>
                <blockquote className="display mt-6 text-2xl leading-snug text-muted-foreground/70">
                  {s}
                </blockquote>
                <figcaption className="hairline mt-10 pt-5 text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  Name · Location
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
