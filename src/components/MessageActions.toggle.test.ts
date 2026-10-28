// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale } from "@/lib/i18n";
import { MESSAGE_ROW, MessageActions } from "./MessageActions";

let host: HTMLDivElement;
let root: Root;

const row = () => host.querySelector<HTMLElement>(`[${MESSAGE_ROW}]`)!;
const body = () => host.querySelector<HTMLElement>("p")!;
const tray = () => host.querySelector<HTMLElement>('[data-testid="message-actions"]')!;
const shown = () => tray().dataset.shown === "true";
const more = () => tray().querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
// The menu lives on <body>, outside the chat scroller, so the tests look there too.
const items = () => [...document.querySelectorAll<HTMLButtonElement>("[role=menuitem]")];

const pointer = (type: string, target: Element, pointerType: string) =>
  act(async () => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: type !== "pointerenter" && type !== "pointerleave", pointerType }));
  });

let picked: string[] = [];

async function render(forceOpen = false, menu?: Parameters<typeof MessageActions>[0]["menu"]) {
  await act(async () => {
    root.render(
      createElement("div", { [MESSAGE_ROW]: "" },
        createElement("p", null, "an answer"),
        createElement(MessageActions, {
          side: "bot",
          forceOpen,
          menu: menu ?? [
            { key: "pin", icon: null, label: "Pin message", onSelect: () => picked.push("pin") },
            { key: "raw", icon: null, label: "Show raw markdown", onSelect: () => picked.push("raw") },
          ],
          children: createElement("button", { type: "button" }, "copy"),
        }),
      ),
    );
  });
}

beforeEach(() => {
  setLocale("en");
  picked = [];
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("message actions row", () => {
  it("shows while the pointer is over the message and hides when it leaves", async () => {
    await render();
    expect(shown()).toBe(false);
    await pointer("pointerenter", row(), "mouse");
    expect(shown()).toBe(true);
    await pointer("pointerleave", row(), "mouse");
    expect(shown()).toBe(false);
  });

  it("does not treat a touch passing over as a hover", async () => {
    await render();
    await pointer("pointerenter", row(), "touch");
    expect(shown()).toBe(false);
  });

  it("shows on a tap of the message and hides on the next", async () => {
    await render();
    await pointer("pointerdown", body(), "touch");
    await pointer("pointerup", body(), "touch");
    expect(shown()).toBe(true);
    await pointer("pointerdown", body(), "touch");
    await pointer("pointerup", body(), "touch");
    expect(shown()).toBe(false);
  });

  it("shows on a long press of the message", async () => {
    vi.useFakeTimers();
    await render();
    await pointer("pointerdown", body(), "touch");
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(shown()).toBe(true);
  });

  it("does not reveal actions after a canceled touch at the same position", async () => {
    vi.useFakeTimers();
    await render();
    await pointer("pointerdown", body(), "touch");
    await pointer("pointercancel", body(), "touch");
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(shown()).toBe(false);
    await pointer("pointerup", body(), "touch");
    expect(shown()).toBe(false);
  });

  it("opens the more menu with the moved actions and closes it on a pick", async () => {
    await render();
    await pointer("pointerenter", row(), "mouse");
    expect(items()).toHaveLength(0);
    await act(async () => more().click());
    expect(more().getAttribute("aria-expanded")).toBe("true");
    expect(items().map((item) => item.textContent)).toEqual(["Pin message", "Show raw markdown"]);
    await pointer("pointerleave", row(), "mouse");
    expect(shown()).toBe(true);
    await act(async () => items()[0]!.click());
    expect(picked).toEqual(["pin"]);
    // The menu leaves with the shared 200ms exit, so it is still in the DOM for that beat.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });
    expect(items()).toHaveLength(0);
  });

  it("renders the shared compact menu recipe and focuses the first item", async () => {
    await render();
    await act(async () => more().click());
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    for (const token of ["w-[240px]", "rounded-[var(--radius-menu)]", "p-1.5", "gap-0.5", "shadow-lg", "border-hairline/50", "bg-menu", "overflow-y-auto", "max-h-[calc(100vh-1rem)]"]) {
      expect(menu.className).toContain(token);
    }
    const first = items()[0]!;
    for (const token of ["h-[30px]", "text-[13px]", "rounded-md", "px-2"]) expect(first.className).toContain(token);
    expect(first.className).toContain("text-start");
    const gutter = first.querySelector("span")!;
    expect(gutter.className).toContain("size-4");
    expect(gutter.className).toContain("[&_svg]:stroke-[1.75]");
    expect(document.activeElement).toBe(first);
  });

  it("opens above and shifts inside the window when the row is near the right edge on a short window", async () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    const rect = (left: number, top: number, width: number, height: number) => ({
      x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}),
    });
    const originalRect = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const element = this as HTMLElement;
      if (element.getAttribute("role") === "menu") return rect(500, 200, 240, 200);
      if (element.getAttribute("aria-haspopup") === "menu") return rect(700, 500, 28, 28);
      if (element.dataset.testid === "message-actions") return rect(700, 500, 80, 28);
      return originalRect.call(this);
    });
    try {
      await render();
      await act(async () => more().click());
      const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
      // Fixed on <body>, above the trigger and clamped in from the right edge.
      expect(menu.style.position).toBe("fixed");
      expect(menu.style.top).toBe("296px");
      expect(menu.style.left).toBe("552px");
    } finally {
      Object.defineProperty(window, "innerWidth", { value: originalWidth, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: originalHeight, configurable: true });
      vi.restoreAllMocks();
    }
  });

  it("renders a separator before a later action", async () => {
    await render(false, [
      { key: "pin", icon: null, label: "Pin message", onSelect: () => picked.push("pin") },
      { key: "raw", icon: null, label: "Show raw markdown", separatorBefore: true, onSelect: () => picked.push("raw") },
    ]);
    await act(async () => more().click());
    expect(document.querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(document.querySelector('[role="separator"]')!.className).toContain("mx-2");
  });

  it("closes the menu on Escape", async () => {
    await render();
    await act(async () => more().click());
    expect(items()).toHaveLength(2);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });
    expect(items()).toHaveLength(0);
  });

  it("keeps a row that must stay reachable out", async () => {
    await render(true);
    expect(shown()).toBe(true);
    await pointer("pointerleave", row(), "mouse");
    expect(shown()).toBe(true);
  });
});
