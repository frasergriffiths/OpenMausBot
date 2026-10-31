import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfirmDialogCard } from "./ConfirmDialog";

const card = (overrides: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(ConfirmDialogCard, {
  open: true,
  title: "Delete thread?",
  body: "“Launch post” and its conversation will be deleted.",
  confirmLabel: "Delete thread",
  onCancel: () => {},
  onConfirm: () => {},
  ...overrides,
}));

describe("the confirm dialog", () => {
  it("uses the same surface and hairline as every other dialog", () => {
    const html = card();
    expect(html).toContain("menu-surface");
    expect(html).toContain("p-5");
    expect(html).not.toContain("border-danger");
  });

  it("puts the icon above a left-aligned title and body", () => {
    const html = card();
    const icon = html.indexOf("<svg");
    const title = html.indexOf('id="confirm-dialog-title"');
    expect(icon).toBeGreaterThan(-1);
    expect(icon).toBeLessThan(title);
    expect(html).toContain('text-[16px] font-semibold leading-[22px]');
    expect(html).not.toContain("items-center text-center");
  });

  it("keeps the destructive confirm button and the copy", () => {
    const html = card();
    expect(html).toContain("Delete thread?");
    expect(html).toContain("“Launch post” and its conversation will be deleted.");
    expect(html).toContain("bg-danger text-danger-ink");
  });

  it("uses the accent button for a neutral question", () => {
    const html = card({ tone: "neutral", confirmLabel: "Replace" });
    expect(html).toContain('data-variant="primary"');
    expect(html).not.toContain("bg-danger");
  });
});
