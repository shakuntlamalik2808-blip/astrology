import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { MagneticButton } from "./MagneticButton";
import { Starfield } from "./Starfield";
import heroCosmos from "@/assets/hero-cosmos.jpg";

const headline = ["Clarity for the", "moments that matter."];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-7%"]);
  const fade = useTransform(scrollYProgress, [0, 0.95], [1, 0.2]);

  return (
    <section
      id="top"
      ref={ref}
      className="surface-night grain relative flex min-h-[92svh] items-center overflow-hidden pt-24"
    >
      <motion.img
        src={heroCosmos}
        alt=""
        width={1600}
        height={1200}
        style={reduced ? {} : { y: imageY }}
        className="absolute inset-0 h-[108%] w-full scale-[1.02] object-cover opacity-48"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/35 via-ink/45 to-ink" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,color-mix(in_oklab,var(--ink)_72%,transparent)_68%)]" />
      <Starfield count={32} />

      <div className="animate-slow-spin pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[min(74vw,54rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/12" />

      <motion.div
        style={reduced ? {} : { y: textY, opacity: fade }}
        className="relative mx-auto w-full max-w-5xl px-6 py-24 text-center lg:px-12"
      >
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.18, duration: 0.65 }}
          className="eyebrow text-gold"
        >
          Jyotish • Counseling • Guidance
        </motion.p>

        <p className="display mt-7 text-[clamp(1.65rem,3vw,2.5rem)] italic text-ivory/92">Shakuntla Malik</p>
         <h1 className="display mx-auto mt-7 max-w-5xl text-[clamp(2.8rem,7.4vw,6.6rem)] text-ivory">
          {headline.map((line, i) => (
            <span key={line} className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                 transition={{ delay: 0.3 + i * 0.12, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              >
                {i === 1 ? <em className="text-gold-gradient not-italic">{line}</em> : line}
              </motion.span>
            </span>
          ))}
        </h1>

         <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-8 border-t border-ivory/15 pt-8">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.7, duration: 0.72 }}
             className="max-w-2xl text-base leading-relaxed text-ivory/72 lg:text-lg"
          >
            Astrology approached as a counseling practice — grounded in insight, timing and
            practical guidance rather than fear or fatalism. Kundli, Lal Kitab and Vastu read
            with care, so the decision in front of you gets clearer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.82, duration: 0.72 }}
             className="flex flex-wrap items-center justify-center gap-4 text-ivory"
          >
            <MagneticButton href="/book-consultation" variant="gold">
              Book a Consultation
            </MagneticButton>
            <MagneticButton href="#practice" variant="outline">
              Explore the Practice
            </MagneticButton>
          </motion.div>
        </div>
      </motion.div>
      <div className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-ivory/45 md:flex" aria-hidden="true">
        <span className="text-[0.62rem] tracking-[0.2em] uppercase">Scroll</span>
        <span className="animate-line-breathe h-10 w-px origin-top bg-gold/60" />
      </div>
    </section>
  );
}
