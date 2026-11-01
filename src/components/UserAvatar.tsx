// A person's avatar, drawn from their identity: no upload, no initials.
// Two offset colour fields under a fine grain, so it reads as a soft orb rather
// than a sticker. The fields drift when you hover it — a small easter egg.
import { useMemo } from "react";
import { cn } from "@/lib/cn";

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function UserAvatar({ seed, size = 28, className }: { seed: string; size?: number; className?: string }) {
  const art = useMemo(() => {
    const h = hash(seed || "person");
    const hue = h % 360;
    const second = (hue + 45 + ((h >>> 7) % 70)) % 360;
    const third = (hue + 200 + ((h >>> 13) % 60)) % 360;
    const x = 25 + ((h >>> 3) % 50);
    const y = 20 + ((h >>> 11) % 60);
    const angle = (h >>> 5) % 360;
    return {
      base: `linear-gradient(${angle}deg, hsl(${hue} 72% 46%), hsl(${second} 68% 58%))`,
      glow: `radial-gradient(circle at ${x}% ${y}%, hsl(${third} 85% 68% / 0.85), transparent 62%)`,
      shade: `radial-gradient(circle at ${100 - x}% ${100 - y}%, hsl(${hue} 60% 18% / 0.55), transparent 70%)`,
      grainSeed: (h % 997) + 1,
    };
  }, [seed]);

  return (
    <span
      className={cn("group relative inline-flex shrink-0 overflow-hidden rounded-full select-none", className)}
      style={{ width: size, height: size, background: art.base }}
      aria-hidden="true"
    >
      <span
        className="absolute -inset-1 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[14deg] group-hover:scale-125 motion-reduce:transition-none"
        style={{ background: art.glow }}
      />
      <span className="absolute inset-0" style={{ background: art.shade }} />
      <svg className="absolute inset-0 opacity-[0.16] mix-blend-overlay" width={size} height={size}>
        <filter id={`grain-${art.grainSeed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={art.grainSeed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${art.grainSeed})`} />
      </svg>
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/15" />
    </span>
  );
}
