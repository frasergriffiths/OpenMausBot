import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SlashCommandMenu } from "./SlashCommandMenu";
import type { ComposerSlashCommand } from "@/lib/composer-commands";

const commands: ComposerSlashCommand[] = [
  { kind: "command", id: "goal", label: "/goal", description: "Keep this bot working on one thing." },
  { kind: "command", id: "learn", label: "/learn", description: "Draft a reusable skill." },
  { kind: "skill", id: "tidy", label: "/tidy", description: "Tidy a folder." },
];
const skillOnly: ComposerSlashCommand[] = [commands[2]!];

const render = (list: ComposerSlashCommand[], highlight = 0, query = "") => renderToStaticMarkup(createElement(SlashCommandMenu, {
  listRef: { current: null },
  motion: { shown: true, className: "", exitProps: {} },
  commands: list,
  highlight,
  query,
  onPick: vi.fn(),
  onHighlight: vi.fn(),
} as never));

describe("the composer's / menu", () => {
  it("draws Commands then Skills, with a live count only on Skills", () => {
    const html = render(commands);
    expect(html).toContain(">Commands<");
    expect(html).toContain(">Skills<");
    expect(html.indexOf(">Commands<")).toBeLessThan(html.indexOf(">Skills<"));
    expect(html).toContain(">1<");
    expect(html).toContain("Skills");
    expect(html).toContain("↑↓ move · ↵ pick · Esc close");
    expect(html).toContain('role="listbox"');
    expect(html).toContain('role="group"');
  });

  it("uses the shared menu surface and rows: no accent tile, pill or accent label", () => {
    const html = render(commands);
    expect(html).toContain("popover-surface");
    expect(html).toContain("bg-menu");
    expect(html).toContain("rounded-[var(--radius-menu)]");
    expect(html).toContain("min-h-11");
    expect(html).toContain("bg-ink/[0.06]");
    expect(html).not.toContain("bg-accent/10");
    expect(html).not.toContain("text-accent");
    expect(html).not.toContain("uppercase");
    expect(html).not.toContain("tracking-[0.08em]");
  });

  it("keeps the menu open with a plain empty state when nothing matches", () => {
    const html = render([], 0, "zzz");
    expect(html).toContain("No commands match “zzz”");
    expect(html).toContain("Type / to see every command");
    expect(html).toContain("↑↓ move · ↵ pick · Esc close");
    expect(html).toContain('role="listbox"');
  });

  it("draws a skill-only list without an empty Commands heading and keeps the 44px floor", () => {
    const html = render(skillOnly);
    expect(html).not.toContain(">Commands<");
    expect(html).toContain(">Skills<");
    expect(html.match(/min-h-11/g)).toHaveLength(1);
  });

});
