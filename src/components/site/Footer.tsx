const nav = [
  { label: "Practice", href: "/#practice" },
  { label: "Consultations", href: "/#services" },
  { label: "Vastu", href: "/#services" },
  { label: "Match Making", href: "/#services" },
  { label: "Academy", href: "/#academy" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#footer" },
  { label: "Book", href: "/book-consultation" },
];

const social = ["Instagram", "Facebook", "YouTube"];

export function Footer() {
  return (
    <footer id="footer" className="bg-ink text-ivory">
       <div className="mx-auto max-w-[88rem] px-6 py-16 lg:px-12 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="display text-4xl">Shakuntla Malik</p>
            <p className="eyebrow mt-3 text-gold/80">Jyotish</p>
            <address className="mt-8 text-sm leading-relaxed text-ivory/60 not-italic">
              Sector 21, Faridabad
              <br />
              Faridabad, Haryana, India
            </address>
            <a
              href="mailto:hello@shakuntlamalik.example"
              className="mt-6 inline-block text-sm text-ivory/80 underline decoration-gold/40 underline-offset-8 transition-colors hover:text-gold"
            >
              hello@shakuntlamalik.example
            </a>
            <p className="mt-3 text-xs text-ivory/35">Placeholder contact — replace with the live address.</p>
          </div>

          <nav className="lg:col-span-4" aria-label="Footer">
            <ul className="grid grid-cols-2 gap-y-3">
              {nav.map((n) => (
                <li key={n.label}>
                  <a
                    href={n.href}
                     className="group inline-flex items-center gap-2 text-sm text-ivory/65 transition-colors duration-200 hover:text-ivory"
                  >
                     <span className="h-px w-0 bg-gold transition-all duration-200 group-hover:w-4" />
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <p className="eyebrow text-ivory/45">Elsewhere</p>
            <ul className="mt-5 space-y-3">
              {social.map((s) => (
                <li key={s}>
                  <a href="/#footer" className="text-sm text-ivory/65 transition-colors hover:text-gold">
                    {s} <span className="text-ivory/30">(link pending)</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm text-ivory/60">
              Sessions are scheduled in your local timezone.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-ivory/10 pt-8 text-xs text-ivory/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Shakuntla Malik. All rights reserved.</p>
          <p>Astrology as counseling — insight, timing and practical guidance.</p>
        </div>
      </div>
    </footer>
  );
}
