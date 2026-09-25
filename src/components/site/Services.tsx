import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

const services = [
  {
    id: "kundli",
    title: "Single Kundli Consultation",
    duration: "60 minutes",
    price: "₹2,100",
    body: "A focused session on your birth chart: guidance, timing insight and practical direction for the decision in front of you.",
    cta: "Explore Consultation",
    tint: "from-[oklch(0.3_0.05_264)] to-[oklch(0.18_0.032_264)]",
  },
  {
    id: "vastu",
    title: "Home Vastu",
    duration: "Property review",
    price: "₹50,000",
    body: "Guidance on home and property direction, placement and layout, with remedies that are practical to actually carry out.",
    cta: "Explore Vastu",
    tint: "from-[oklch(0.42_0.09_42)] to-[oklch(0.2_0.04_40)]",
  },
  {
    id: "match",
    title: "Match Making",
    duration: "Compatibility review",
    price: "₹2,100",
    body: "A compatibility-focused chart review for relationship understanding, expectations and timing-aware guidance.",
    cta: "Explore Match Making",
    tint: "from-[oklch(0.38_0.06_250)] to-[oklch(0.18_0.035_260)]",
  },
];

export function Services() {
  const [active, setActive] = useState(0);
  const current = services[active] ?? services[0];
  if (!current) return null;

  return (
    <section id="services" className="editorial-section relative bg-background">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-12">
        <Reveal>
          <p className="eyebrow text-terracotta">Consultations</p>
          <h2 className="display mt-6 max-w-3xl text-[clamp(2.3rem,5vw,4.25rem)]">
            Choose the conversation you need.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-7">
            <ul className="border-t border-border">
              {services.map((s, i) => (
                <Reveal as="li" key={s.id} delay={i * 0.08}>
                  <div
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                       "group border-b border-border py-8 transition-colors duration-200 lg:py-10",
                      active === i && "bg-secondary/40",
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-2 lg:px-6">
                      <h3 className="display text-3xl lg:text-[2.75rem]">{s.title}</h3>
                      <p className="display text-xl text-gold lg:text-2xl">
                        {s.price}
                        <span className="ml-3 align-middle font-sans text-[0.62rem] tracking-[0.18em] text-muted-foreground uppercase">
                          {s.duration}
                        </span>
                      </p>
                    </div>
                    <div className="mt-5 flex flex-col gap-6 px-2 lg:flex-row lg:items-end lg:justify-between lg:px-6">
                      <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                      <a
                        href="/book-consultation"
                        className="inline-flex shrink-0 items-center gap-2 text-[0.78rem] tracking-[0.16em] text-foreground uppercase"
                      >
                        {s.cta}
                         <ArrowUpRight className="h-4 w-4 text-gold transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </a>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-5">
             <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                   transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "grain relative flex h-full w-full flex-col justify-end bg-gradient-to-br p-8",
                    current.tint,
                  )}
                >
                   <span className="animate-slow-spin absolute -top-20 -right-20 h-80 w-80 rounded-full border border-gold/18" />
                   <span className="eyebrow text-gold">0{active + 1} / 03</span>
                   <p className="display mt-4 text-4xl text-ivory">{current.title}</p>
                   <p className="display mt-2 text-2xl text-gold/90">{current.price}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
