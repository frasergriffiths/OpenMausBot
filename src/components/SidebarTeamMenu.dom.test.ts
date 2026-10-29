// @vitest-environment happy-dom
// The department ⋯ menu: the same surface, rows and pop motion as the bot menu, placed inside the window, with
// arrow-key focus, Escape and Tab closing it, and focus returning to the ⋯ that opened it.
import { createElement, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TeamContextMenu, TeamMenuItems, type TeamMenuState } from "./SidebarTeamMenu";

const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

let host: HTMLDivElement;
let root: Root;
let triggerRect = { left: 296, top: 100, right: 320, bottom: 128, width: 24, height: 28, x: 296, y: 100, toJSON() {} };

beforeEach(() => {
  triggerRect = { left: 296, top: 100, right: 320, bottom: 128, width: 24, height: 28, x: 296, y: 100, toJSON() {} };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 480 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute("data-team-menu")) return { left: 0, top: 0, right: 240, bottom: 300, width: 240, height: 300, x: 0, y: 0, toJSON() {} } as DOMRect;
    if (this.hasAttribute("data-team-trigger")) return triggerRect as DOMRect;
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
  });
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function Harness() {
  const [menu, setMenu] = useState<TeamMenuState | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return createElement("div", null,
    createElement("button", {
      ref: trigger,
      "data-team-trigger": "",
      onClick: () => {
        const rect = trigger.current!.getBoundingClientRect();
        setMenu({ name: "Engineering", anchor: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, trigger: trigger.current });
      },
    }, "⋯"),
    createElement(TeamContextMenu, {
      menu,
      onClose: () => setMenu(null),
      onAddBots: vi.fn(),
      onRename: vi.fn(),
      onShare: vi.fn(),
      onDelete: vi.fn(),
      onSetForAll: vi.fn(),
      onSetOwner: vi.fn(),
      onSeeReports: vi.fn(),
    }),
  );
}

const trigger = () => host.querySelector<HTMLButtonElement>("[data-team-trigger]")!;
const panel = () => document.querySelector<HTMLElement>("[data-team-menu]");
const rows = () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
const press = (element: Element, key: string) => element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the department menu's rows", () => {
  it("ends on Delete, never Delete department", () => {
    const markup = renderToStaticMarkup(createElement(TeamMenuItems, { onAddBots: vi.fn(), onRename: vi.fn(), onShare: vi.fn(), onDelete: vi.fn() }));
    expect(text(markup)).toBe("Add bots Rename department Share department… Delete");
    expect(markup).not.toContain("Delete department");
  });

  it("groups the settings rows between separators, in the order the sidebar uses", () => {
    const markup = renderToStaticMarkup(createElement(TeamMenuItems, {
      onAddBots: vi.fn(), onRename: vi.fn(), onShare: vi.fn(), onDelete: vi.fn(),
      onSetForAll: vi.fn(), onSeeReports: vi.fn(), onSetOwner: vi.fn(),
    }));
    expect(text(markup)).toBe("Add bots Set for all bots in this department… See who reports to whom Set owner for all bots… Rename department Share department… Delete");
    expect(markup.match(/role="separator"/g)).toHaveLength(3);
    expect(markup.match(/role="menuitem"/g)).toHaveLength(7);
  });
});

describe("the department menu's panel", () => {
  it("carries the shared recipe and pop motion, and sits fully inside a 320x480 window from the right edge", async () => {
    flushSync(() => root.render(createElement(Harness)));
    trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    const sheet = panel()!;
    expect(sheet.className).toContain("rounded-[var(--radius-menu)]");
    expect(sheet.className).toContain("border-hairline/50");
    expect(sheet.className).toContain("bg-menu");
    expect(sheet.className).toContain("p-1.5");
    expect(sheet.className).toContain("shadow-lg");
    expect(sheet.className).toContain("animate-pop-in");
    expect(sheet.className).toContain("max-w-[calc(100vw-16px)]");
    expect(sheet.getAttribute("role")).toBe("menu");
    expect(sheet.getAttribute("aria-label")).toBe("Engineering");
    const left = Number.parseFloat(sheet.style.left), top = Number.parseFloat(sheet.style.top);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 240).toBeLessThanOrEqual(312);
    expect(top).toBe(134);
    expect(top + 300).toBeLessThanOrEqual(472);
  });

  it("flips above the trigger when there is no room below", async () => {
    triggerRect = { left: 296, top: 372, right: 320, bottom: 400, width: 24, height: 28, x: 296, y: 372, toJSON() {} };
    flushSync(() => root.render(createElement(Harness)));
    trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    const sheet = panel()!;
    expect(Number.parseFloat(sheet.style.top)).toBe(66);
    expect(Number.parseFloat(sheet.style.top) + 300).toBeLessThanOrEqual(472);
  });

  it("moves focus with ArrowDown and ArrowUp, closes on Escape or Tab and hands focus back to the ⋯", async () => {
    flushSync(() => root.render(createElement(Harness)));
    trigger().focus();
    trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    expect(document.activeElement).toBe(rows()[0]);
    press(document.activeElement!, "ArrowDown");
    expect(document.activeElement).toBe(rows()[1]);
    press(document.activeElement!, "ArrowUp");
    expect(document.activeElement).toBe(rows()[0]);
    press(document.activeElement!, "Escape");
    await new Promise((resolve) => setTimeout(resolve, 260));
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
    trigger().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    press(document.activeElement!, "Tab");
    await new Promise((resolve) => setTimeout(resolve, 260));
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
