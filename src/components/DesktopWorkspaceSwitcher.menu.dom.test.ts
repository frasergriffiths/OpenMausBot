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
let environments: { state: ReturnType<typeof vi.fn>; switch: ReturnType<typeof vi.fn> };

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

async function mount({ saved = true }: { saved?: boolean } = {}) {
  (window as unknown as { ogb: unknown }).ogb = {
    workspaces: worlds,
    ...(saved ? { environments } : {}),
  };
  await act(async () => root.render(createElement(DesktopWorkspaceSwitcher, { inline: true, pill: true })));
  await flush();
}

describe("the Simple computer switcher", () => {
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
    expect(menu.className).toContain("p-2");
    expect(menu.className).toContain("animate-pop-in");
    expect(rows().map((row) => row.textContent?.trim())).toEqual(["This computer", "Mac mini"]);
    expect(rows()[0]!.getAttribute("aria-checked")).toBe("true");
    expect(rows()[1]!.getAttribute("aria-checked")).toBe("false");
    expect(rows()[0]!.className).toContain("bg-raised");
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
});
