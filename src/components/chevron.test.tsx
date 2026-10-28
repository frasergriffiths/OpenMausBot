import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Chevron } from "./chevron";

const html = (props: Parameters<typeof Chevron>[0]) => renderToStaticMarkup(createElement(Chevron, props));

describe("the shared chevron", () => {
  it("points right when a disclosure is closed, including RTL, and down when open", () => {
    expect(html({})).toContain("-rotate-90");
    expect(html({})).toContain("rtl:rotate-90");
    expect(html({ open: false })).toContain("-rotate-90");
    expect(html({ open: true })).toContain("rotate-0");
    expect(html({ open: true })).not.toContain("-rotate-90");
  });

  it("turns a menu caret over when its menu opens", () => {
    expect(html({ kind: "menu" })).toContain("rotate-0");
    expect(html({ kind: "menu", open: true })).toContain("rotate-180");
    expect(html({ kind: "menu", open: true })).not.toContain("-rotate-90");
  });

  it("keeps the paired size and stroke steps, and never above 16", () => {
    for (const [size, px, stroke] of [["inline", 12, "2"], ["row", 14, "1.75"], ["control", 16, "1.75"]] as const) {
      const markup = html({ size });
      expect(markup).toContain(`width="${px}"`);
      expect(markup).toContain(`height="${px}"`);
      expect(markup).toContain(`stroke-width="${stroke}"`);
    }
    expect(html({ size: "control" })).not.toContain('width="18"');
  });

  it("carries one motion, quiet ink and decorative semantics", () => {
    const markup = html({ className: "text-ink-secondary" });
    expect(markup).toContain("transition-transform");
    expect(markup).toContain("duration-150");
    expect(markup).toContain("motion-reduce:transition-none");
    expect(markup).toContain("text-ink-tertiary text-ink-secondary");
    expect(markup).toContain('aria-hidden="true"');
  });
});
