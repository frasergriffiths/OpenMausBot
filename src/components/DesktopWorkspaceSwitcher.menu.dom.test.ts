// @vitest-environment happy-dom
// The Simple switcher's list is an in-app themed sheet, not the native menu: this mounts the real component and drives
// its rows, the checked current computer, a no-op pick, and the native fallback when the saved list is unavailable.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopWorkspaceSwitcher } from "./DesktopWorkspaceSwitcher";

let host: HTMLDivElement;
let root: Root;
let worlds: { state: ReturnType<typeof vi.fn>; menu: ReturnType<typeof vi.fn> };
let environments: { state: ReturnType<typeof vi.fn>; switch: ReturnType<typeof vi.fn>; forget: ReturnType<typeof vi.fn> };

const trigger = () => host.querySelector<HTMLButtonElement>('[data-tour="server-switcher"]')!;
const sheet = () => document.querySelector<HTMLElement>("[data-workspace-menu]");
const rows = () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 260)); });
const flush = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };

beforeEach(() => {
  worlds = { state: vi.fn(async () => ({ local: true, name: "This computer" })), menu: vi.fn(async () => {}) };
  environments = {
    state: vi.fn(async () => ({
      localOrigin: "http://127.0.0.1:8799", remote: false, packaged: true, activeId: "local",
      environments: [{ id: "mini", kind: "remote", name: "Mac mini", origin: "https://mini.example" }],
    })),
    switch: vi.fn(async () => ({ ok: true })),
    forget: vi.fn(async () => ({ ok: true })),
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = "";
  delete (window as unknown as { ogb?: unknown }).ogb;
});

async function mount({ saved = true, activeId = "local", confirm = true, props = {} }: {
  saved?: boolean; activeId?: string; confirm?: boolean; props?: Record<string, unknown>;
} = {}) {
  environments.state.mockImplementation(async () => ({
    localOrigin: "http://127.0.0.1:8799", remote: false, packaged: true, activeId,
    environments: [{ id: "mini", kind: "remote", name: "Mac mini", origin: "https://mini.example" }],
  }));
  (window as unknown as { ogb: unknown }).ogb = {
    workspaces: worlds,
    confirm: vi.fn(async () => confirm),
    ...(saved ? { environments } : {}),
  };
  await act(async () => root.render(createElement(DesktopWorkspaceSwitcher, { inline: true, pill: true, ...props })));
  await flush();
}

describe("the Simple computer switcher", () => {
  it("is a 36px pill, the height of the + beside it", async () => {
    await mount();
    expect(trigger().className).toContain("h-9");
    expect(trigger().className).not.toContain("h-8");
  });

  it("opens a themed menu on <body> with the saved computers and a checked current one", async () => {
    await mount();
    expect(trigger().getAttribute("aria-label")).toBe("Switch server: This computer");
    await act(async () => trigger().click());
    const menu = sheet()!;
    expect(menu).not.toBeNull();
    expect(menu.parentElement).toBe(document.body);
    expect(menu.getAttribute("role")).toBe("menu");
    expect(menu.className).toContain("bg-menu");
    expect(menu.className).toContain("border-hairline/50");
    expect(menu.className).toContain("rounded-[var(--radius-menu)]");
    expect(menu.className).toContain("p-1.5");
    expect(menu.className).toContain("w-[240px]");
    expect(menu.className).toContain("gap-0.5");
    expect(menu.className).toContain("shadow-lg");
    expect(menu.className).not.toContain("shadow-2xl");
    expect(menu.className).not.toContain("animate-pop-in");
    expect(menu.className).not.toContain("animate-pop-out");
    const rowsNow = rows();
    for (const token of ["min-h-[30px]", "text-[13px]", "rounded-md", "px-2"]) expect(rowsNow[1]!.className).toContain(token);
    expect(rowsNow[1]!.querySelector("span")!.className).toContain("size-4");
    expect(rowsNow[1]!.textContent).toContain("mini.example");
    expect(rows()).toHaveLength(2);
    expect(rows()[0]!.textContent).toBe("This computer");
    expect(rows()[1]!.textContent).toContain("Mac mini");
    expect(rows()[1]!.textContent).toContain("mini.example");
    expect(rows()[0]!.getAttribute("aria-checked")).toBe("true");
    expect(rows()[1]!.getAttribute("aria-checked")).toBe("false");
    expect(rows()[0]!.className).toContain("bg-ink/[0.06]");
    expect(rows()[0]!.querySelector(".lucide-check")).not.toBeNull();
  });

  it("treats the current computer as a no-op and switches only to another one", async () => {
    await mount();
    await act(async () => trigger().click());
    await act(async () => rows()[0]!.click());
    await settle();
    expect(environments.switch).not.toHaveBeenCalled();
    expect(sheet()).toBeNull();

    await act(async () => trigger().click());
    await act(async () => rows()[1]!.click());
    expect(environments.switch).toHaveBeenCalledWith("mini");
  });

  it("keeps the native server menu when the saved list is not available", async () => {
    await mount({ saved: false });
    await act(async () => trigger().click());
    await flush();
    expect(worlds.menu).toHaveBeenCalledTimes(1);
    expect(sheet()).toBeNull();
  });

  it("restores the computer actions: Add a Cloud, Connect to another computer, and Forget for a saved remote", async () => {
    const onConnectServer = vi.fn();
    const onAddCloud = vi.fn();
    await mount({ activeId: "mini", props: { onConnectServer, onAddCloud } });
    await act(async () => trigger().click());
    const actions = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].map((row) => row.textContent);
    expect(actions).toEqual(["Add a Cloud…", "Connect to another computer…", "Forget “Mac mini”…"]);
    expect(document.querySelectorAll('[role="separator"]')).toHaveLength(1);

    await act(async () => document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[1]!.click());
    expect(onConnectServer).toHaveBeenCalledOnce();
    await settle();

    await act(async () => trigger().click());
    await act(async () => document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[0]!.click());
    expect(onAddCloud).toHaveBeenCalledOnce();
  });

  it("forgets a saved remote only after the person confirms", async () => {
    await mount({ activeId: "mini", confirm: false });
    await act(async () => trigger().click());
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((row) => row.textContent?.startsWith("Forget"))!.click());
    await flush();
    expect(environments.forget).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    root = createRoot(host);
    await mount({ activeId: "mini", confirm: true });
    await act(async () => trigger().click());
    await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((row) => row.textContent?.startsWith("Forget"))!.click());
    await flush();
    expect(environments.forget).toHaveBeenCalledWith("mini");
  });

  it("closes on a second press of the same trigger instead of reopening", async () => {
    await mount();
    await act(async () => trigger().click());
    expect(sheet()).not.toBeNull();
    // The real press: a pointerdown on the trigger, then its own click.
    await act(async () => trigger().dispatchEvent(new Event("pointerdown", { bubbles: true })));
    await act(async () => trigger().click());
    await settle();
    expect(sheet()).toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});
