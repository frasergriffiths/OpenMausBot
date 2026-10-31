import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { DigestChip } from "@/components/DigestChip";
import { Button } from "@/components/ui";
import type { Message } from "@/state/store";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
// windows checkouts can carry crlf line endings
const css = readFileSync(join(src, "styles.css"), "utf8").replace(/\r\n/g, "\n");

function rule(selector: string): Record<string, string> {
  const start = css.indexOf(`  ${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start)).replace(/\/\*[\s\S]*?\*\//g, "");
  return Object.fromEntries(body.split(";").map((line) => line.trim()).filter(Boolean)
    .map((line) => [line.slice(0, line.indexOf(":")).trim(), line.slice(line.indexOf(":") + 1).trim()]));
}

const button = (props: Parameters<typeof Button>[0]) => renderToStaticMarkup(createElement(Button, props, "Label"));

describe("control scale", () => {
  it("steps the shared button 28, 32 and 36px with a centered medium label", () => {
    const xs = button({ size: "xs" });
    expect(xs).toContain("h-7");
    expect(xs).toContain("px-2.5");
    expect(xs).toContain("text-[13px]");
    const sm = button({ size: "sm" });
    expect(sm).toContain("h-8");
    expect(sm).toContain("px-3");
    const md = button({ size: "md" });
    expect(md).toContain("h-9");
    expect(md).toContain("text-[14px]");
    for (const markup of [xs, sm, md]) {
      expect(markup).toContain("inline-flex");
      expect(markup).toContain("items-center");
      expect(markup).toContain("justify-center");
      expect(markup).toContain("font-medium");
    }
  });

  it("publishes the shared button under data attributes, never the retired class names", () => {
    const markup = button({ variant: "primary", size: "sm" });
    expect(markup).toContain('data-ui="button"');
    expect(markup).toContain('data-variant="primary"');
    expect(markup).not.toContain("ui-button");
    expect(button({ size: "xs", shape: "pill" })).toContain('data-shape="pill"');
    expect(button({ size: "sm" })).not.toContain('data-shape="pill"');
  });

  it("gives chips, code and menu rows one size each", () => {
    expect(rule(".ui-chip")).toMatchObject({ "min-height": "1.375rem", "border-radius": "9999px", "font-size": "12px", "font-weight": "500", "line-height": "1rem" });
    expect(rule(".ui-code-chip")).toMatchObject({ "box-decoration-break": "clone", "font-family": "var(--font-mono)", "font-size": "0.86em", "line-height": "1" });
    expect(rule(".ui-menu-row")).toMatchObject({ "min-height": "2.25rem", "font-size": "14px", "line-height": "1.25rem", gap: "0.75rem" });
  });

  it("keeps every remaining control step on skin tokens", () => {
    for (const selector of [".ui-chip", ".ui-code-chip", ".ui-menu-row"]) {
      expect(Object.values(rule(selector)).join(" "), selector).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }
  });

  it("is what the digest chip and inline code render with", () => {
    const message: Message = {
      id: "digest", role: "bot", kind: "digest", at: 1,
      digest: { turnId: "t", botId: "b", threadId: "th", at: 1, durationMs: 1, tools: [{ name: "Read", count: 2, failed: 0 }],
        files: { changed: [], added: [], deleted: [] }, memory: [], reply: "", hookCoverage: "preview" },
    };
    expect(renderToStaticMarkup(createElement(DigestChip, { message }))).toMatch(/class="ui-chip /);
    const html = renderToStaticMarkup(createElement(ChatMarkdown, { text: "run `pnpm test` now" }));
    expect(html).toContain('class="ui-code-chip break-words [unicode-bidi:isolate]"');
    expect(html).not.toContain("text-[13px]");
  });
});

