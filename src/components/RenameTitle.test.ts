import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { RenameTitle } from "./RenameTitle";

describe("RenameTitle", () => {
  it("renders a plain label with no rename gesture and no text cursor", () => {
    const markup = renderToStaticMarkup(createElement(RenameTitle, {
      value: "Maus",
      onCommit: vi.fn(),
      title: "Maus · Researcher",
      className: "truncate",
    }));

    expect(markup).toContain("Maus");
    expect(markup).toContain('title="Maus · Researcher"');
    expect(markup).not.toContain("cursor-text");
    expect(markup).not.toContain("tabindex");
    expect(markup).not.toContain('role="button"');
    expect(markup).not.toContain("aria-label");
  });
});
