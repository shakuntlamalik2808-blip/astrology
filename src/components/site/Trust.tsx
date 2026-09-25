import { ShieldCheck, HeartHandshake, Compass, UserRound, Globe2, Clock3 } from "lucide-react";
import { Reveal } from "./Reveal";

const items = [
  { icon: ShieldCheck, title: "Ethical practice", body: "Honest readings, clear boundaries, no pressure to return." },
  { icon: HeartHandshake, title: "No fear-based predictions", body: "Guidance is never delivered as a threat or an ultimatum." },
  { icon: Compass, title: "Practical remedies", body: "Measured, doable suggestions grounded in Lal Kitab principles." },
  { icon: UserRound, title: "Personalised consultation", body: "Every session is built around your chart and your question." },
  { icon: Globe2, title: "Worldwide availability", body: "Clients from Faridabad and across the world." },
  { icon: Clock3, title: "Local timezone scheduling", body: "Sessions are scheduled in your local time." },
];

export function Trust() {
  return (
    <section className="editorial-section bg-background">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-12">
        <Reveal>
          <p className="eyebrow text-terracotta">How This Practice Works</p>
        </Reveal>
        <div className="mt-14 grid border-t border-border sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.06}>
               <div className="group h-full border-b border-border px-2 py-9 sm:odd:border-r lg:border-r lg:px-8 lg:nth-[3n]:border-r-0">
                <it.icon
                   className="h-6 w-6 text-gold transition-transform duration-200 group-hover:-translate-y-1"
                  strokeWidth={1.2}
                />
                <h3 className="display mt-6 text-2xl">{it.title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
