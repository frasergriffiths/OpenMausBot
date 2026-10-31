import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAUS_COLORS, SPINNER_HUE_PERCENT, spinnerColor, type MausColor } from "./mascot";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const SKINS = ["midnight", "atelier", "foundry", "lagoon", "graphite", "linen", "dusk", "daylight", "meadow", "pop"] as const;
const DEFAULTS = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

function rawVar(skin: string, name: string): string {
  const block = css.match(new RegExp(`\\[data-skin="${skin}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
  const value = (block.match(new RegExp(`--${name}:\\s*([^;]+);`)) ?? DEFAULTS.match(new RegExp(`--${name}:\\s*([^;]+);`)))?.[1]?.trim();
  if (!value) throw new Error(`missing --${name} for ${skin}`);
  return value;
}

function varFor(skin: string, name: string): string {
  let value = rawVar(skin, name);
  const seen = new Set<string>();
  while (value.startsWith("var(")) {
    const referenced = value.match(/^var\(--([\w-]+)\)$/)?.[1];
    if (!referenced || seen.has(referenced)) throw new Error(`unresolved ${value} for ${skin}/${name}`);
    seen.add(referenced);
    value = rawVar(skin, referenced);
  }
  return value;
}

function parseColor(value: string, skin: string): [number, number, number] {
  const text = value.trim();
  if (text.startsWith("#")) return rgb(text);
  const direct = text.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\)$/);
  if (direct) return [Number(direct[1]), Number(direct[2]), Number(direct[3])];
  const mixed = text.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+)\)$/);
  if (mixed) {
    const first = parseColor(mixed[1]!, skin);
    const second = parseColor(mixed[3]!, skin);
    const share = Number(mixed[2]) / 100;
    return first.map((channel, index) => channel * share + second[index]! * (1 - share)) as [number, number, number];
  }
  if (text === "transparent") return [0, 0, 0];
  throw new Error(`unsupported colour ${text} for ${skin}`);
}

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((char) => char + char).join("") : h;
  return [0, 2, 4].map((index) => Number.parseInt(full.slice(index, index + 2), 16) / 255) as [number, number, number];
};

const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const gamma = (channel: number) => (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055);

function toOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const [lr, lg, lb] = [r, g, b].map(linear) as [number, number, number];
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const [l3, m3, s3] = [l, m, s].map((value) => Math.sign(value) * Math.abs(value) ** (1 / 3)) as [number, number, number];
  return [
    0.2104542553 * l3 + 0.793617785 * m3 - 0.0040720468 * s3,
    1.9779984951 * l3 - 2.428592205 * m3 + 0.4505937099 * s3,
    0.0259040371 * l3 + 0.7827717662 * m3 - 0.808675766 * s3,
  ];
}

function fromOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((value) => Math.min(1, Math.max(0, gamma(value)))) as [number, number, number];
}

const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const contrast = (left: [number, number, number], right: [number, number, number]) => {
  const [hi, lo] = [luminance(left), luminance(right)].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

function statusInk(color: MausColor, skin: string): [number, number, number] {
  const hue = toOklab(rgb(MAUS_COLORS[color]));
  const ink = toOklab(rgb(varFor(skin, "color-ink")));
  const share = SPINNER_HUE_PERCENT / 100;
  return fromOklab(hue.map((channel, index) => channel * share + ink[index]! * (1 - share)) as [number, number, number]);
}

describe("the running mark on a tab", () => {
  it("uses a skin-aware ink mix, not the raw mascot hue", () => {
    expect(spinnerColor("green")).toBe("color-mix(in oklab, #009957 65%, var(--color-ink))");
  });

  it("gives the focused menu row an inset ring with 3:1 contrast on every skin", () => {
    const rule = css.match(/:root \[role="menu"\] :is\(button, \[role\^="menuitem"\]\):focus-visible\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toContain("outline: 2px solid var(--color-focus)");
    expect(rule).toContain("outline-offset: -2px");
    expect(rule).not.toContain("outline: none");
    const failures: string[] = [];
    for (const skin of SKINS) {
      const focus = varFor(skin, "color-focus");
      const menu = varFor(skin, "color-menu");
      const ratio = contrast(parseColor(focus, skin), parseColor(menu, skin));
      if (ratio < 3) failures.push(`${skin}: ${ratio.toFixed(2)}:1`);
    }
    expect(failures).toEqual([]);
  });

  it("clears 3:1 against every skin's active tab fill, for every mascot colour", () => {
    expect(new Set(SKINS).size).toBe(10);
    const failures: string[] = [];
    for (const skin of SKINS) {
      const raised = rgb(varFor(skin, "color-raised"));
      for (const color of Object.keys(MAUS_COLORS) as MausColor[]) {
        const ratio = contrast(statusInk(color, skin), raised);
        if (ratio < 3) failures.push(`${skin}/${color}: ${ratio.toFixed(2)}:1`);
      }
    }
    expect(failures).toEqual([]);
  });
});
