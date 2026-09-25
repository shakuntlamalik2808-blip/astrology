import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "motion/react";
import { Menu, X } from "lucide-react";
import { MagneticButton } from "./MagneticButton";
import { cn } from "@/lib/utils";
import { useWebsiteSettings } from "@/lib/website-settings";

const links = [
  { label: "Practice", href: "/#practice" },
  { label: "Consultations", href: "/#services" },
  { label: "Vastu", href: "/#services" },
  { label: "Match Making", href: "/#services" },
  { label: "Academy", href: "/#academy" },
  { label: "About", href: "/#about" },
];

export function Navbar() {
  const settings = useWebsiteSettings();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 text-ivory transition-all duration-300",
          scrolled
            ? "bg-ink/88 border-b border-ivory/10 py-3 backdrop-blur-xl"
            : "border-b border-ivory/8 py-5",
        )}
      >
        <nav className="mx-auto grid max-w-[88rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:flex lg:justify-between lg:px-12">
          <a href="/#top" className="group flex min-w-0 items-baseline gap-3">
            <span
              className={cn(
                 "display transition-all duration-300",
                scrolled ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
              )}
            >
              <span className="flex items-center gap-2"><img src={settings.logoUrl} alt="" className="size-8 rounded-full object-cover" /><span className="block truncate">{settings.brandName}</span></span>
            </span>
            <span className="eyebrow hidden text-gold/80 sm:inline">Jyotish</span>
          </a>

          <ul className="hidden items-center gap-8 lg:flex">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                   className="group relative text-[0.72rem] tracking-[0.12em] text-ivory/70 uppercase transition-colors duration-200 hover:text-ivory"
                >
                  {l.label}
                   <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-gold transition-all duration-200 group-hover:w-full" />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden lg:block">
              <MagneticButton href="/book-consultation" variant="gold" className="px-6 py-3">
                Book a Consultation
              </MagneticButton>
            </div>
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-sm border border-ivory/25 transition-colors duration-200 hover:border-gold lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="surface-night fixed inset-0 z-60 flex flex-col px-6 py-6 lg:hidden"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <span className="display min-w-0 truncate text-xl text-ivory sm:text-2xl">{settings.brandName}</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                 className="flex h-11 w-11 items-center justify-center rounded-sm border border-ivory/25 text-ivory"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="mt-16 flex flex-col gap-2">
              {links.map((l, i) => (
                <motion.li
                  key={l.label}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i + 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="display block border-b border-ivory/10 py-4 text-3xl text-ivory sm:text-4xl"
                  >
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <MagneticButton href="/book-consultation" variant="gold" onClick={() => setOpen(false)} className="w-full">
                Book a Consultation
              </MagneticButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
