import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { courses } from "@/lib/data";
import { formatInr } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const metadata: Metadata = {
  title: "Academy",
  description: "Upcoming Jyotish courses with Shakuntla Malik — foundations, dasha counseling, and Lal Kitab ethics.",
};

export default function AcademyPage() {
  return (
    <div className="container py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-gold-dark">Education</p>
        <h1 className="mt-4 font-serif text-4xl md:text-5xl">Academy</h1>
        <p className="mt-4 text-muted-foreground">
          Small cohorts, live seminars, and written assignments. Classes meet on video; recordings are available for
          two weeks after each session.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.slug}>
            <CardHeader>
              <Badge variant="muted">{course.level}</Badge>
              <CardTitle className="mt-3 text-xl">{course.title}</CardTitle>
              <CardDescription>{course.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Starts{" "}
                {new Date(course.startsAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p>{course.durationWeeks} weeks · {course.seats} seats</p>
              <p className="font-serif text-2xl">{formatInr(course.priceInr)}</p>
            </CardContent>
            <CardFooter>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="gold" className="w-full">
                    Enrol
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enrol in {course.title}</DialogTitle>
                    <DialogDescription>
                      Enrollment checkout will connect to the same payments API as consultations. This is a
                      placeholder confirmation.
                    </DialogDescription>
                  </DialogHeader>
                  <p className="text-sm">
                    Email hello@shakuntlamalik.example with the course slug <code>{course.slug}</code> and your
                    timezone. Seats are confirmed after payment.
                  </p>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
