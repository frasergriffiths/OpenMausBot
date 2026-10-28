// styles.css strips the outline from text fields (Chromium matches :focus-visible on click), so each field must show focus itself (WCAG 2.4.7).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(src, "styles.css"), "utf8");

/** Cut every `@layer` block: unlayered CSS outranks Tailwind's utilities. */
function unlayered(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const start = source.indexOf("@layer", i);
    if (start === -1) return out + source.slice(i);
    out += source.slice(i, start);
    const open = source.indexOf("{", start);
    const semi = source.indexOf(";", start);
    if (semi !== -1 && semi < open) {
      i = semi + 1;
      continue;
    }
    let depth = 0;
    let j = open;
    for (; j < source.length; j++) {
      if (source[j] === "{") depth++;
      else if (source[j] === "}" && --depth === 0) break;
    }
    i = j + 1;
  }
  return out;
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("text field focus", () => {
  it("still keeps the browser outline off text fields", () => {
    expect(css).toMatch(/:is\(input(?::not\([^)]*\))?, textarea, select\):focus-visible\s*\{\s*outline:\s*none;/);
  });

  it("paints a focused field's own border in the focus colour, above every utility", () => {
    const rule = unlayered(css).match(/:is\(input, textarea, select\):focus-visible(?::not\([^)]*\))?\s*\{([^}]*)\}/g) ?? [];
    expect(rule.join("\n")).toMatch(/border-color:\s*var\(--color-focus\)/);
  });

  it("leaves a field that reports an error in its error colour while focused", () => {
    const selectors = [...unlayered(css).matchAll(/([^{}]+)\{[^}]*border-color:\s*var\(--color-focus\)[^}]*\}/g)].map((match) => match[1].trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(
      selector.includes(':not([aria-invalid="true"])') || selector.includes(':not(:has([aria-invalid="true"]))'),
    ).toBe(true);
  });

  it("gives every text field the same halo ring, except the composer and the model search", () => {
    const rings = [...unlayered(css).matchAll(/([^{}]+)\{([^}]*box-shadow:[^}]*var\(--color-focus\)[^}]*)\}/g)].map((match) => match[1]!.trim());
    expect(rings.length).toBeGreaterThan(0);
    expect(rings.join("\n")).toContain("[data-menu-search]");
    expect(rings.join("\n")).toContain('[data-tour="composer"] textarea');
  });

  it("gives every text field one radius from the skin's control scale", () => {
    const rules = [...unlayered(css).matchAll(/([^{}]+)\{([^}]*border-radius:\s*var\(--radius-lg[^}]*)\}/g)].map((match) => match[1]!.trim());
    expect(rules.some((selector) => selector.includes(":is(input") && selector.includes("textarea"))).toBe(true);
  });

  it("draws focus around a composed field, never inside it", () => {
    const cssText = unlayered(css);
    expect(cssText).toMatch(/:is\(\.ui-field\):focus-within/);
    expect(cssText).toMatch(/:is\(\.ui-field, \[data-field-shell\]\) :is\(input, textarea, select\):focus-visible\s*\{[^}]*box-shadow:\s*none/);
  });

  it("scopes the field recipe to Simple so Advanced keeps its own chrome", () => {
    const scoped = [
      ...unlayered(css).matchAll(/([^{}]+)\{[^}]*border-color:\s*var\(--color-focus\)[^}]*\}/g),
      ...unlayered(css).matchAll(/([^{}]+)\{[^}]*box-shadow:[^}]*var\(--color-focus\)[^}]*\}/g),
      ...unlayered(css).matchAll(/([^{}]+)\{[^}]*border-radius:\s*var\(--radius-lg[^}]*\}/g),
    ].map((match) => match[1]!.replace(/\/\*[\s\S]*?\*\//g, "").trim()).filter((selector) => selector.includes(":is(input"));
    expect(scoped.length).toBeGreaterThan(0);
    for (const selector of scoped) expect(selector.includes(':root[data-interface="simple"]')).toBe(true);
  });

  it("never fades focus to the resting hairline", () => {    const faint: string[] = [];
    for (const file of sources(src)) {
      readFileSync(file, "utf8").split("\n").forEach((line, index) => {
        for (const [utility] of line.matchAll(/focus(?:-within)?:border-hairline(?:\/\d+)?(?![\w-])/g)) {
          faint.push(`${relative(src, file)}:${index + 1} ${utility}`);
        }
      });
    }
    expect(faint).toEqual([]);
  });
});
