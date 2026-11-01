// A person's avatar, drawn from their identity: no upload, no initials.
// A stable hash picks two hues and a symmetric pixel pattern, so the same
// account always gets the same mark and two people rarely collide.
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

function bits(seed: number): boolean[] {
  const cells: boolean[] = [];
  let value = seed;
  for (let column = 0; column < 3; column++) {
    for (let row = 0; row < 5; row++) {
      value = (Math.imul(value, 1103515245) + 12345) >>> 0;
      cells.push(((value >>> 8) & 1) === 1);
    }
  }
  return cells;
}

export function UserAvatar({ seed, size = 28, className }: { seed: string; size?: number; className?: string }) {
  const { cells, base, light } = useMemo(() => {
    const h = hash(seed || "person");
    const hue = h % 360;
    const hue2 = (hue + 40 + (h >>> 9) % 80) % 360;
    return { cells: bits(h), base: `hsl(${hue} 68% 52%)`, light: `hsl(${hue2} 72% 62%)` };
  }, [seed]);

  const grid = 5;
  const gap = 1;
  const cell = (size - gap * (grid + 1)) / grid;

  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${base}, ${light})` }}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0">
        {Array.from({ length: grid }, (_, column) =>
          Array.from({ length: grid }, (_, row) => {
            const mirrored = column < 3 ? column : grid - 1 - column;
            const on = cells[mirrored * grid + row] ?? false;
            if (!on) return null;
            return (
              <rect
                key={`${column}-${row}`}
                x={gap + column * (cell + gap)}
                y={gap + row * (cell + gap)}
                width={cell}
                height={cell}
                rx={cell * 0.22}
                fill="rgba(255,255,255,0.92)"
              />
            );
          }),
        )}
      </svg>
    </span>
  );
}
