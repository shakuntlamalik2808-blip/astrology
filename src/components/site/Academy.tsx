import { Reveal } from "./Reveal";
import { MagneticButton } from "./MagneticButton";
import academyImg from "@/assets/academy.webp";
import { useWebsiteSettings } from "@/lib/website-settings";

const modules = [
  { title: "Foundations of Jyotish", body: "Signs, houses, planets and the logic that binds them." },
  { title: "Chart Interpretation", body: "Reading a kundli as a whole rather than a list of placements." },
  { title: "Structured Learning", body: "Sequenced modules with revision, notes and guided practice." },
  { title: "Practical Application", body: "Case-based work — applying the chart to real questions." },
];

export function Academy() {
  const settings = useWebsiteSettings();
  return (
    <section id="academy" className="surface-night section-rule editorial-section grain relative overflow-hidden">
      <div className="relative mx-auto grid max-w-[88rem] gap-16 px-6 lg:grid-cols-12 lg:px-12">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="eyebrow text-gold">The Academy</p>
            <h2 className="display mt-6 text-[clamp(2.3rem,5vw,4.25rem)] text-ivory">
              Learn Jyotish with structure, context and practice.
            </h2>
            <p className="mt-8 max-w-md text-sm leading-relaxed text-ivory/65">
              A teaching programme for students who want the tradition taught properly — its
              reasoning, its limits and its responsible use.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/65">{settings.academyContent}</p>
            <div className="mt-10">
              <MagneticButton href="/book-consultation" variant="gold">
                Explore the Academy
              </MagneticButton>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-14 overflow-hidden rounded-sm border border-ivory/12">
              <img
                src={academyImg}
                alt="Brass astrological wheel beside a handwritten Vedic chart"
                loading="lazy"
                decoding="async"
                width={1408}
                height={1008}
                 className="h-64 w-full object-cover opacity-80 transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.025]"
              />
            </div>
          </Reveal>
        </div>

        <ol className="lg:col-span-6 lg:col-start-7">
          {modules.map((m, i) => (
            <Reveal as="li" key={m.title} delay={i * 0.08}>
              <div className="group flex gap-4 border-b border-ivory/12 py-8 sm:gap-8">
                <span className="eyebrow pt-2 text-gold/70">0{i + 1}</span>
                <div>
                   <h3 className="display text-2xl text-ivory transition-transform duration-200 group-hover:translate-x-1 lg:text-3xl">
                    {m.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory/60">{m.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
