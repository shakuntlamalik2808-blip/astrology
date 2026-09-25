import { useState } from "react";
import { motion } from "motion/react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

const pillars = [
  {
    title: "Counseling Psychology",
    meta: "The conversation",
    body: "Sessions are held as counseling: listening first, reading second. Context, temperament and what you are actually deciding all shape the guidance.",
  },
  {
    title: "Jyotish",
    meta: "The chart",
    body: "Classical Vedic chart work — houses, dashas and transits — used to locate timing, pressure points and windows that favour action.",
  },
  {
    title: "Lal Kitab",
    meta: "The remedy",
    body: "Simple, ethical and practical remedies in the Lal Kitab tradition. Nothing fear-based, nothing extravagant, nothing you cannot sustain.",
  },
];

export function PracticePillars() {
  const [active, setActive] = useState(1);

  return (
    <section className="surface-night section-rule editorial-section relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="relative mx-auto max-w-[88rem] px-6 lg:px-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <p className="eyebrow text-gold">Three Disciplines</p>
            <h2 className="display mt-6 max-w-2xl text-[clamp(2.3rem,5vw,4.25rem)] text-ivory">
              One practice, held together by three ways of seeing.
            </h2>
          </Reveal>
        </div>

        <div className="mt-16 border-t border-ivory/15">
          {pillars.map((p, i) => {
            const isActive = active === i;
            return (
              <motion.button
                key={p.title}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className={cn(
                  "group grid w-full overflow-hidden border-b border-ivory/15 px-2 py-8 text-left transition-colors duration-200 md:grid-cols-12 md:items-start md:px-6",
                  isActive ? "bg-ivory/6" : "hover:bg-ivory/3",
                )}
              >
                <span className="eyebrow text-gold/80 md:col-span-2">0{i + 1} · {p.meta}</span>
                <h3 className="display mt-4 text-3xl text-ivory md:col-span-4 md:mt-0 lg:text-[2.35rem]">{p.title}</h3>
                <motion.p
                  animate={{ opacity: isActive ? 1 : 0.45, y: isActive ? 0 : 8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="relative mt-5 max-w-lg text-sm leading-relaxed text-ivory/70 md:col-span-5 md:col-start-8 md:mt-0"
                >
                  {p.body}
                </motion.p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
