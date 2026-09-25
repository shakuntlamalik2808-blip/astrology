import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/utils";
import { services } from "@/lib/data";

export const metadata: Metadata = {
  title: "Services",
  description: "Single Kundli Consultation, Home Vastu, and Match Making services.",
};

export default function ServicesPage() {
  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold-dark">Offerings</p>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Services &amp; fees</h1>
        <p className="mt-4 text-muted-foreground">
          These are the current services available through the practice.
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
    </div>
  );
}
