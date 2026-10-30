import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Bot } from "@/state/store";
import { SidebarSimpleRowActions } from "./SidebarSimpleRowActions";

const bot = {
  id: "atlas", threadId: "t", name: "Atlas", title: "", description: "", color: "green",
  notifications: true, unread: false, messages: [], modelSelection: { instanceId: "none", model: "m" },
} as Bot;

describe("a hover-revealed row action", () => {
  it("takes the shared button corner, not a smaller one of its own", () => {
    const markup = renderToStaticMarkup(createElement(SidebarSimpleRowActions, {
      bot, instances: [], menuOpen: false, onMenu: () => {},
    }));
    expect(markup).toContain("ui-hover-action");
    expect(markup).not.toMatch(/justify-center rounded-md/);
  });

  it("reserves the action column at rest, so a hover never shifts the title", () => {
    const source = readFileSync(new URL("./Sidebar.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/group-hover:pr-|group-focus-within:pr-/);
    expect(source.match(/showThreads \? "pl-6 pr-\[5\.75rem\] max-md:pr-9"/g)).toHaveLength(2);
  });

  it("is defined once in the shared button layer", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.ui-hover-action \{\s*border-radius: 0\.375rem;\s*\}/);
  });
});
