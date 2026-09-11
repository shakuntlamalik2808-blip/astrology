import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/utils";
import { retainers, services } from "@/lib/data";

export const metadata: Metadata = {
  title: "Services",
  description: "Kundli consultations, daily counseling retainers, Vastu audits, and birth-time rectification.",
};

export default function ServicesPage() {
  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold-dark">Offerings</p>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Services &amp; fees</h1>
        <p className="mt-4 text-muted-foreground">
          Transparent pricing. The highlighted single Kundli consultation is the usual first step for new clients.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {services.map((service) => (
          <Card
            key={service.id}
            className={
              service.highlighted
                ? "border-gold shadow-gold ring-1 ring-gold/40"
                : "border-cosmic/10"
            }
          >
            <CardHeader>
              {service.highlighted ? <Badge variant="gold">Most booked</Badge> : null}
              <CardTitle className="mt-2">{service.title}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-3xl">{formatInr(service.price)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{service.duration}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {service.includes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-gold-dark">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {service.highlighted ? (
                <Button asChild variant="gold" className="w-full">
                  <Link href="/book">Book consultation</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/book">Enquire</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <section className="mt-20">
        <h2 className="font-serif text-3xl">Day-to-day counseling retainers</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Fifteen-minute video check-ins. Notes live in your client file. Cancel or pause with two weeks’ notice.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {retainers.map((plan) => (
            <Card key={plan.title}>
              <CardHeader>
                <CardTitle className="text-xl">{plan.title}</CardTitle>
                <CardDescription>{plan.cadence}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-serif text-2xl">{formatInr(plan.price)}</p>
                <p className="mt-3 text-sm text-muted-foreground">{plan.blurb}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-8 md:grid-cols-2">
        <div className="rounded-xl border bg-secondary/50 p-8">
          <h2 className="font-serif text-2xl">Vastu Shastra audits</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Homes, consulting rooms, and small offices. You share a labeled floor plan; we return directional notes,
            entrance and kitchen comments, and a staged list of changes that do not require demolition.
          </p>
        </div>
        <div className="rounded-xl border bg-secondary/50 p-8">
          <h2 className="font-serif text-2xl">Event-based birth time rectification</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            When hospital records disagree with family memory, we reconstruct a working time from dated events —
            education, marriage, relocation, health — then lock that time for future Kundli work.
          </p>
        </div>
      </section>
    </div>
  );
}
