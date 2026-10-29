// @vitest-environment happy-dom
// The place control's menu is the app's shared sheet: this mounts the real control, opens it, and reads the classes,
// the keyboard walk and the bot fields a pick writes.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bot } from "@/state/store";

const fixture = vi.hoisted(() => ({ patch: vi.fn(), dispatch: vi.fn() }));

vi.mock("@/state/store", async (importOriginal) => {
  const store = await importOriginal<typeof import("@/state/store")>();
  return {
    ...store,
    useStore: () => ({ state: { ...store.initialState, config: null, instances: [] }, dispatch: fixture.dispatch }),
  };
});
vi.mock("@/components/DesktopCapabilities", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/DesktopCapabilities")>()),
  useDesktopCapabilities: () => ({ capabilities: { host: { platform: "darwin" } }, ready: true }),
}));
vi.mock("@/components/PlaceChip", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/components/PlaceChip")>();
  const view = (state: string, short: string, line: string) => ({ view: { state, params: {}, short, line, action: null }, policy: true, reachable: true });
  return {
    ...mod,
    usePlaceViews: () => ({
      cloud: view("cc-new", "Ready", "Gets its own cloud desktop when a task needs one."),
      vm: view("vm", "Separate from your screen", "A private Linux desktop on this device."),
      local: view("local", "Your screen", "Uses your screen, mouse, and keyboard."),
      browser: view("browser", "Web pages only", "Works in the built-in browser only."),
    }),
  };
});

const { PlaceControl } = await import("./PlaceControl");

let host: HTMLDivElement;
let root: Root;

const bot = (extra: Partial<Bot> = {}): Bot =>
  ({ id: "b1", threadId: "t1", name: "Ava", title: "", description: "", soul: "", ...extra }) as Bot;
const trigger = () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
const sheet = () => document.querySelector<HTMLElement>("[data-place-menu]");
const rows = () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
const row = (name: string) => rows().find((item) => item.textContent?.startsWith(name))!;
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });
const press = async (element: HTMLElement) => act(async () => { element.click(); });

async function mount(extra: Partial<Bot> = {}) {
  await act(async () => root.render(createElement(PlaceControl, { bot: bot(extra), patch: fixture.patch, approvalMode: "ask" })));
}

beforeEach(() => {
  fixture.patch.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = "";
});

describe("the place control", () => {
  it("names the place in use and the one the bot is running on now", async () => {
    await mount({ tasks: [{ threadId: "t1", title: "Main", surface: "browser" }] as Bot["tasks"] });
    expect(trigger().getAttribute("aria-label")).toBe("Where Ava works. Currently Automatic.");
    expect(host.textContent).toContain("Right now: Browser");
    expect(trigger().className).toContain("rounded-xl");
  });

  it("opens the shared menu sheet: 240px, --radius-menu, 30px rows, 16px icons, shadow-lg, no motion class", async () => {
    await mount();
    expect(sheet()).toBeNull();
    await press(trigger());
    const menu = sheet()!;
    for (const cls of ["popover-surface", "rounded-[var(--radius-menu)]", "bg-menu", "p-1.5", "shadow-lg", "gap-1"]) {
      expect(menu.className, cls).toContain(cls);
    }
    expect(menu.className).not.toContain("animate-pop-in");
    expect(menu.className).not.toContain("animate-pop-out");
    expect(menu.style.width).toBe("240px");
    expect(menu.parentElement).toBe(document.body);
    const options = rows();
    expect(options.map((option) => option.textContent?.split("Uses")[0]?.trim().slice(0, 20))).toHaveLength(5);
    for (const option of options) {
      expect(option.className).toContain("min-h-[30px]");
      expect(option.className).toContain("rounded-md");
      const icon = option.querySelector("span > svg")!;
      expect(icon.getAttribute("width")).toBe("16");
      expect(option.querySelector("span")!.className).toContain("size-4");
    }
  });

  it("writes the place the panel writes, and closes at once", async () => {
    await mount();
    await press(trigger());
    await press(row("Built-in browser"));
    expect(fixture.patch).toHaveBeenCalledExactlyOnceWith({ computer: "browser", browser: true });
    expect(sheet()).toBeNull();
  });

  it("walks the rows with the arrow keys and leaves on Escape", async () => {
    await mount();
    await press(trigger());
    const menu = sheet()!;
    const key = (name: string) => act(async () => {
      menu.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
    });
    expect(document.activeElement, "a click lands on the place in use").toBe(rows()[0]);
    await key("ArrowDown");
    expect(document.activeElement).toBe(rows()[1]);
    await key("ArrowDown");
    expect(document.activeElement).toBe(rows()[2]);
    await key("ArrowUp");
    expect(document.activeElement).toBe(rows()[1]);
    await key("Escape");
    await settle();
    expect(sheet()).toBeNull();
  });
});
