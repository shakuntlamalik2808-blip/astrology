import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-cosmic text-ivory">
      <div className="container grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl">Shakuntla Malik</p>
          <p className="mt-3 max-w-sm text-sm text-ivory/70">
            Counseling psychology,  Jyotish, and Lal Kitab — practice based in Faridabad, serving clients worldwide.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Studio</p>
          <p className="mt-3 text-sm text-ivory/80">
            Sector 21, Faridabad
            <br />
            Haryana, India
          </p>
          <p className="mt-3 text-sm text-ivory/80">hello@shakuntlamalik.example</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Hours &amp; timezones</p>
          <p className="mt-3 text-sm text-ivory/80">
            Sessions are scheduled in your local timezone. Availability spans IST, GMT, and US Pacific/Eastern evenings.
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <Link href="/book" className="text-gold hover:underline">
              Book
            </Link>
            <Link href="/academy" className="text-gold hover:underline">
              Academy
            </Link>
            <Link href="/admin/login" className="text-ivory/50 hover:text-ivory">
              Staff
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-ivory/50">
        © {new Date().getFullYear()} Shakuntla Malik. All rights reserved.
      </div>
    </footer>
  );
}
