// @vitest-environment happy-dom
// The move-to-department picker draws the shared menu surface, keeps its rows on the same rhythm, and stays inside
// the window when it opens from a row near the bottom-right corner.
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ dispatch: vi.fn() }));

vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return {
    ...original,
    useStore: () => ({
      state: { ...original.initialState, sections: ["Sales", "Support", "Design"], bots: [], groups: [] },
      dispatch: fixture.dispatch,
    }),
  };
});

const { SectionPicker } = await import("./SidebarSectionPicker");
const { MENU_LABEL } = await import("./menu-recipe");
const { SIMPLE_MENU } = await import("./SidebarSimpleTop");

let host: HTMLDivElement;
let root: Root;
let onClose: () => void;
let onAssign: (section: string) => void;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose = vi.fn();
  onAssign = vi.fn();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 480 });
});

afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

/** Draws the picker at the bottom-right of a 320x480 window and measures it at 220x180. */
function render(anchor = { x: 300, y: 460 }, current: string | undefined = "Sales") {
  flushSync(() => root.render(createElement(SectionPicker, { current, anchor, onClose, onAssign })));
  const panel = document.querySelector<HTMLElement>("[data-section-picker]")!;
  vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({
    width: 220, height: 180, left: 0, top: 0, right: 220, bottom: 180, x: 0, y: 0, toJSON() {},
  } as DOMRect);
  window.dispatchEvent(new Event("resize"));
  return panel;
}

const buttonWith = (panel: HTMLElement, words: string) =>
  [...panel.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes(words));

describe("the move-to-department picker", () => {
  it("uses the shared menu surface and a menu label, not the old uppercase 10px heading", () => {
    const panel = render();
    const heading = panel.firstElementChild as HTMLElement;
    expect(panel.className).toContain(SIMPLE_MENU);
    expect(panel.className).toContain("min-w-[220px]");
    expect(panel.className).toContain("max-w-[calc(100vw-16px)]");
    expect(heading.className).toBe(MENU_LABEL);
    expect(heading.className).not.toContain("uppercase");
    expect(heading.textContent).toBe("Move to department");
  });

  it("flips above a bottom-right trigger and stays 8px inside every edge", () => {
    const panel = render();
    expect(panel.style.left).toBe("92px");
    expect(panel.style.top).toBe("274px");
  });

  it("ticks the current department in the gutter and keeps Add disabled until a name is typed", () => {
    const panel = render();
    const current = buttonWith(panel, "Sales")!;
    expect(current.className).toContain("bg-menu-active");
    expect(current.querySelectorAll("svg.lucide-check")).toHaveLength(1);
    expect(panel.querySelectorAll("svg.lucide-check")).toHaveLength(1);
    expect(current.querySelector("svg.lucide-check")?.getAttribute("width")).toBe("16");

    const add = panel.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(add.disabled).toBe(true);
    expect(add.className).not.toContain("bg-accent");

    const input = panel.querySelector<HTMLInputElement>("input")!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    flushSync(() => {
      setValue.call(input, "Research");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(add.disabled).toBe(false);
    expect(add.className).toContain("bg-accent");
  });

  it("offers the danger row as a normal menu row when the bot is in a department", () => {
    const panel = render();
    const danger = buttonWith(panel, "Move to General")!;
    expect(danger.className).toContain("text-danger");
    expect(danger.querySelector("svg.lucide-folder-minus")?.getAttribute("width")).toBe("16");
    expect(buttonWith(panel, "Move to General")?.className).toContain("min-h-[30px]");
  });

  it("closes on Escape, Tab, an outside click and the window losing focus", () => {
    const panel = render();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(3);

    window.dispatchEvent(new Event("blur"));
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it("has no danger row when the bot is not in a department", () => {
    const panel = render({ x: 300, y: 460 }, "");
    expect(buttonWith(panel, "Move to General")).toBeUndefined();
  });
});
