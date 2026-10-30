// @vitest-environment happy-dom
// The Simple sidebar's edge bump in a real DOM: it stays inside the <aside> and hangs over the sidebar's right edge in
// CSS, so a width change moves it in the same frame instead of waiting for a measured position.
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { SidebarEdgeToggle, SidebarSearchPill } from "./SidebarSimpleTop";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  flushSync(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function Harness({ onToggle, shown = true }: { onToggle: () => void; shown?: boolean }) {
  return createElement("aside", { "data-sidebar": "" },
    createElement(SidebarEdgeToggle, { collapsed: false, onToggle, shown, style: { WebkitAppRegion: "no-drag" } as never }));
}

it("stays inside the sidebar and hangs 14px over its right edge", () => {
  const onToggle = vi.fn();
  flushSync(() => root.render(createElement(Harness, { onToggle })));
  const bump = container.querySelector<HTMLButtonElement>("[data-sidebar-edge-toggle]")!;
  expect(bump.parentElement).toBe(container.querySelector("aside"));
  expect(bump.className).toContain("absolute");
  expect(bump.className).toContain("-right-[14px]");
  expect(bump.className).not.toContain("fixed");
  expect(bump.style.left).toBe("");
  flushSync(() => bump.click());
  expect(onToggle).toHaveBeenCalledOnce();
});

it("stays out of sight until the sidebar or the bump is hovered, and reports the hover", () => {
  function Hidden({ shown }: { shown: boolean }) {
    return createElement("aside", {}, createElement(SidebarEdgeToggle, { collapsed: false, shown, onHover, onToggle: () => {} }));
  }
  const onHover = vi.fn();
  flushSync(() => root.render(createElement(Hidden, { shown: false })));
  const bump = () => container.querySelector<HTMLButtonElement>("[data-sidebar-edge-toggle]")!;
  expect(bump().className).toContain("opacity-0");
  expect(bump().className).toContain("focus-visible:opacity-100");
  flushSync(() => bump().dispatchEvent(new MouseEvent("pointerover", { bubbles: true })));
  expect(onHover).toHaveBeenCalledWith(true);
  flushSync(() => root.render(createElement(Hidden, { shown: true })));
  expect(bump().className).toContain("opacity-100");
});

it("keeps the Simple search field's text and Escape clearing, and carries no visible clear button", () => {
  const onQuery = vi.fn();
  const onClear = vi.fn();
  flushSync(() => root.render(createElement(SidebarSearchPill, { query: "atlas", onQuery, onClear })));
  const input = container.querySelector<HTMLInputElement>("input")!;
  expect(input.value).toBe("atlas");
  expect(input.readOnly).toBe(false);
  // No X to press: the field is always there, so a clear control that cannot be hidden is dead weight.
  expect(container.querySelector("button")).toBeNull();
  expect(container.querySelector('[aria-label="Clear search"]')).toBeNull();
  flushSync(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(onClear).toHaveBeenCalledOnce();
  expect(onQuery).not.toHaveBeenCalled();
});
