import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { setLocale } from "@/lib/i18n";
import { NoBots } from "./NoBots";
import { MASCOT_BODY_IDS } from "../../shared/mascot-bodies";

describe("the app with no bots", () => {
  it("shows every mascot shape and one way to make a bot", () => {
    setLocale("en");
    const html = renderToStaticMarkup(createElement(NoBots, { onNew: () => {} }));
    for (const id of MASCOT_BODY_IDS) expect(html).toContain(`data-mascot="${id}"`);
    expect(html).toContain("No bots yet");
    expect(html).toContain("New bot");
  });
});

