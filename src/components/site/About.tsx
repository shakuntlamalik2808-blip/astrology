import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { Reveal, RevealWords } from "./Reveal";
import { MagneticButton } from "./MagneticButton";
import portrait from "@/assets/about-portrait.jpg";

export function About() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section id="about" className="editorial-section bg-background">
      <div className="mx-auto grid max-w-[88rem] gap-16 px-6 lg:grid-cols-12 lg:px-12">
        <div ref={ref} className="relative lg:col-span-5">
          <div className="relative overflow-hidden rounded-sm bg-secondary">
            <motion.img
              src={portrait}
              alt="Abstract portrait placeholder representing the practice"
              loading="lazy"
              width={1008}
              height={1264}
              style={reduced ? {} : { y }}
              className="h-full w-full scale-110 object-cover"
            />
          </div>
            <span className="pointer-events-none absolute right-0 -bottom-5 h-24 w-24 border-r border-b border-gold/55 sm:-right-5" />
        </div>

        <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
          <Reveal>
            <p className="eyebrow text-terracotta">About</p>
          </Reveal>
          <h2 className="display mt-6 text-[clamp(2.3rem,5vw,4.25rem)]">
            <RevealWords text="Meet Shakuntla Malik" />
          </h2>

          <Reveal delay={0.1}>
            <p className="mt-10 text-lg leading-relaxed text-foreground/85">
              Shakuntla Malik practises astrology as counseling. Her work brings together
              counseling psychology, classical Jyotish and Lal Kitab — used not to make dramatic
              predictions, but to help people understand themselves, read their timing and act
              with intention.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Consultations cover kundli guidance, home Vastu and match making, and always end
              with remedies that are ethical, measured and realistic to follow.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="mt-10 hairline pt-8">
              <p className="display text-2xl">Based in Faridabad. Serving clients worldwide.</p>
            </div>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-10">
              <MagneticButton href="#practice" variant="outline" className="text-foreground">
                Meet the Practice
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
