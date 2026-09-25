import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  href?: string;
  variant?: "gold" | "outline" | "ivory";
  className?: string;
  onClick?: () => void;
};

const variants = {
  gold: "bg-gold text-ink hover:bg-gold-soft",
  ivory: "bg-ivory text-ink hover:bg-gold-soft",
  outline:
    "border border-current/35 text-current hover:border-current/70 hover:bg-current/5",
};

export function MagneticButton({ children, href = "/book-consultation", variant = "gold", className, onClick }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  function handleMove(e: MouseEvent<HTMLAnchorElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.25);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.3);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group relative inline-flex min-h-12 items-center justify-center gap-3 rounded-sm px-7 py-3.5 text-[0.76rem] font-medium tracking-[0.14em] uppercase transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold",
        variants[variant],
        className,
      )}
    >
      {children}
      <span className="h-px w-5 bg-current transition-all duration-200 group-hover:w-8" aria-hidden="true" />
    </motion.a>
  );
}
