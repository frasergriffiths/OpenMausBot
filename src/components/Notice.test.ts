import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Notice } from "./Notice";

describe("the shared notice", () => {
  it("carries the service states in one look, with an optional action after the sentence", () => {
    const ready = renderToStaticMarkup(createElement(Notice, { tone: "ready", children: "Connected apps service is ready" }));
    expect(ready).toContain('data-notice="ready"');
    expect(ready).toContain("bg-success/10");
    expect(ready).toContain('role="status"');

    const warning = renderToStaticMarkup(createElement(Notice, {
      tone: "warning",
      action: createElement("button", { type: "button", children: "Open settings" }),
      children: "Connected apps are temporarily unavailable.",
    }));
    expect(warning).toContain('data-notice="warning"');
    expect(warning).toContain("bg-warning/10");
    expect(warning).toContain(">Connected apps are temporarily unavailable.<");
    expect(warning).toContain(">Open settings<");

    const error = renderToStaticMarkup(createElement(Notice, { tone: "error", children: "Could not reach the service." }));
    expect(error).toContain('data-notice="error"');
    expect(error).toContain("bg-danger/10");
    expect(error).toContain('role="alert"');
  });
});
