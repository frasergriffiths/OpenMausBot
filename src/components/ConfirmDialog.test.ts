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
    expect(html).toContain("rounded-2xl border border-hairline/50 bg-panel");
    expect(html).not.toContain("border-danger");
  });

  it("stacks the icon above a centred title and body", () => {
    const html = card();
    const stack = html.indexOf("flex flex-col items-center text-center");
    const icon = html.indexOf("<svg");
    const title = html.indexOf('id="confirm-dialog-title"');
    expect(stack).toBeGreaterThan(-1);
    expect(icon).toBeGreaterThan(stack);
    expect(icon).toBeLessThan(title);
  });

  it("keeps the destructive confirm button and the copy", () => {
    const html = card();
    expect(html).toContain("Delete thread?");
    expect(html).toContain("“Launch post” and its conversation will be deleted.");
    expect(html).toContain("bg-danger text-white");
  });

  it("uses the accent button for a neutral question", () => {
    const html = card({ tone: "neutral", confirmLabel: "Replace" });
    expect(html).toContain("bg-accent text-white");
    expect(html).not.toContain("bg-danger");
  });
});
