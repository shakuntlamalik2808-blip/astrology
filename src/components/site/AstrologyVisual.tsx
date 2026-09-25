import { useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { Starfield } from "./Starfield";
import { Reveal } from "./Reveal";

const bodies = [
  { label: "Su", r: 12, dur: "32s" },
  { label: "Ch", r: 20, dur: "48s" },
  { label: "Gu", r: 28, dur: "68s" },
  { label: "Śu", r: 36, dur: "92s" },
  { label: "Śa", r: 44, dur: "128s" },
];

export function AstrologyVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 60, damping: 20 });
  const sy = useSpring(y, { stiffness: 60, damping: 20 });

  return (
    <section
      className="surface-night grain relative overflow-hidden py-28 lg:py-40"
      onMouseMove={(e) => {
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 40);
        y.set(((e.clientY - (r.top + r.height / 2)) / r.height) * 40);
      }}
    >
      <Starfield count={64} />
      <div className="relative mx-auto max-w-[88rem] px-6 text-center lg:px-12">
        <Reveal>
          <p className="eyebrow text-gold">The Chart in Motion</p>
          <h2 className="display mx-auto mt-6 max-w-3xl text-[clamp(2.3rem,5vw,4.5rem)] text-ivory">
            Nothing stands still. Neither does timing.
          </h2>
        </Reveal>

        <div ref={ref} className="relative mx-auto mt-16 aspect-square w-full max-w-2xl">
          <motion.div style={reduced ? {} : { x: sx, y: sy }} className="absolute inset-0">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--gold)_22%,transparent)_0%,transparent_58%)]" />
            <div className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_60px_18px_color-mix(in_oklab,var(--gold)_35%,transparent)]" />
            {bodies.map((b) => (
              <div
                key={b.label}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/20"
                style={{ width: `${b.r * 2}%`, height: `${b.r * 2}%` }}
              >
                <div
                  className="h-full w-full"
                  style={{ animation: `slow-spin ${b.dur} linear infinite` }}
                >
                  <span className="group absolute top-1/2 -left-3.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-gold/50 bg-ink text-[0.6rem] tracking-wider text-gold transition-colors duration-500 hover:bg-gold hover:text-ink">
                    {b.label}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-14 max-w-xl text-sm leading-relaxed text-ivory/65">
            Planetary periods and transits move continuously. Reading them well is less about
            predicting an outcome and more about recognising when a door is genuinely open.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
