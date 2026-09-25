import { useMemo } from "react";

export function Starfield({ count = 48, className = "" }: { count?: number; className?: string }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const r = seed / 233280;
        const r2 = ((i * 4391 + 7919) % 10007) / 10007;
        return {
          left: `${(r * 100).toFixed(2)}%`,
          top: `${(r2 * 100).toFixed(2)}%`,
          size: r2 > 0.85 ? 2.2 : 1.2,
          delay: `${(r * 6).toFixed(2)}s`,
        };
      }),
    [count],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full bg-gold-soft"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
