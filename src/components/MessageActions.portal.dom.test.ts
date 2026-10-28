// @vitest-environment happy-dom
// The chat scroller makes a stacking context, so an absolutely positioned menu inside it can never rise above the
// 280px sidebar. These mount the real MessageActions inside a scroll container and prove the menu leaves it, keeps its
// motion, runs its action and hands focus back to the three dots.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGE_ROW, MessageActions } from "./MessageActions";

let host: HTMLDivElement;
let root: Root;
let picked: string[];

const more = () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
const menu = () => document.querySelector<HTMLElement>('[role="menu"]');
const items = () => [...document.querySelectorAll<HTMLButtonElement>("[role=menuitem]")];
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });

async function mount(menuItems = [{ key: "pin", icon: null, label: "Pin message", onSelect: () => picked.push("pin") }]) {
  await act(async () => {
    root.render(
      createElement("div", { "data-chat-scroller": "", style: { overflowY: "auto" } },
        createElement("div", { [MESSAGE_ROW]: "" },
          createElement("p", null, "an answer"),
          createElement(MessageActions, { side: "bot", forceOpen: true, menu: menuItems }),
        ),
      ),
    );
  });
}

beforeEach(() => {
  picked = [];
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("message actions menu", () => {
  it("renders on <body> with fixed position and the standard menu motion", async () => {
    await mount();
    const scroller = host.querySelector<HTMLElement>("[data-chat-scroller]")!;
    await act(async () => more().click());
    const sheet = menu()!;
    expect(sheet).not.toBeNull();
    expect(scroller.contains(sheet)).toBe(false);
    expect(sheet.parentElement).toBe(document.body);
    expect(sheet.style.position).toBe("fixed");
    expect(sheet.className).toContain("z-50");
    expect(sheet.className).toContain("animate-pop-in");
    expect(sheet.className).toContain("rounded-[var(--radius-menu)]");
    expect(document.activeElement).toBe(items()[0]);
  });

  it("runs the picked action, closes with the exit motion and returns focus to the three dots", async () => {
    await mount();
    await act(async () => more().click());
    await act(async () => items()[0]!.click());
    expect(picked).toEqual(["pin"]);
    expect(menu()!.className).toContain("animate-pop-out");
    await settle();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it("closes on Escape and returns focus to the three dots", async () => {
    await mount();
    await act(async () => more().click());
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await settle();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it("closes on a click elsewhere and returns focus to the three dots", async () => {
    await mount();
    await act(async () => more().click());
    await act(async () => {
      document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    await settle();
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it("opens above the three dots near the bottom instead of clipping", async () => {
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    const rect = (left: number, top: number, width: number, height: number) => ({
      x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}),
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const element = this as HTMLElement;
      if (element.getAttribute("role") === "menu") return rect(200, 200, 240, 200);
      if (element.getAttribute("aria-haspopup") === "menu") return rect(300, 520, 28, 28);
      return rect(0, 0, 0, 0);
    });
    await mount();
    await act(async () => more().click());
    // 520 + 4 + 200 overflows 600, so it sits at 520 - 4 - 200.
    expect(menu()!.style.top).toBe("316px");
    expect(menu()!.style.left).toBe("300px");
  });
});
