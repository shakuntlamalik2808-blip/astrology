import Link from "next/link";
import { BookOpen, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Compass,
    title: "Single Kundli Consultation",
    href: "/services",
    body: "A sixty-minute consultation for chart guidance, timing insight, and practical life direction.",
  },
  {
    icon: Sparkles,
    title: "Home Vastu",
    href: "/services",
    body: "Guidance for home or property direction, placement, and practical remedies to create harmony.",
  },
  {
    icon: BookOpen,
    title: "Match Making",
    href: "/services",
    body: "Compatibility-focused chart review for relationship understanding and timing-aware guidance.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-cosmic text-ivory">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.18),_transparent_42%)]" />
        <div className="container relative grid gap-12 py-24 md:grid-cols-2 md:items-center md:py-32">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Faridabad · Worldwide</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl lg:text-6xl">
              Astrology as a counseling practice, not a spectacle.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ivory/75">
              Shakuntla Malik reads  charts with the discipline of a clinician: clear language, ethical
              remedies, and timing that respects your timezone and your life.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg">
                <Link href="/book">Book a ₹2100 consultation</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-ivory/30 text-ivory hover:bg-white/10">
                <Link href="/about">Meet the practice</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-gold/30 bg-white/5 p-8 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Practice pillars</p>
            <ul className="mt-6 space-y-5 text-sm text-ivory/80">
              <li>
                <strong className="text-ivory">Counseling psychology.</strong> Sessions are structured for insight, not
                fatalism.
              </li>
              <li>
                <strong className="text-ivory"> interpretation.</strong> Diamond-chart literacy with Navamsa
                and dasha sequencing.
              </li>
              <li>
                <strong className="text-ivory">Lal Kitab principles.</strong> Practical, proportionate remedies — never
                scare tactics.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="gold-rule mx-auto" />
          <h2 className="mt-6 font-serif text-3xl md:text-4xl">How the work is offered</h2>
          <p className="mt-3 text-muted-foreground">
            Three core offerings designed for clarity, guidance, and practical life decisions.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-cosmic/10">
              <CardHeader>
                <feature.icon className="h-6 w-6 text-gold-dark" />
                <CardTitle className="mt-4 text-xl">{feature.title}</CardTitle>
                <CardDescription>{feature.body}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={feature.href} className="text-sm font-medium text-gold-dark hover:underline">
                  Learn more
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
