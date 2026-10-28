// @vitest-environment happy-dom
// The Templates dialog is the Apps dialog's sibling: this mounts the real one and locks its shell, its filter
// pills, the shared search field, Escape and the focus trap, so a later layout change cannot quietly split them.
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/state/store";

const apiMock = vi.fn(async (path: string) => {
  if (path === "/api/team-library/catalog") return { teams: [] };
  if (path === "/api/org-library") return { organization: null, packages: [] };
  throw new Error(`unexpected request: ${path}`);
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/state/store", () => ({
  api: apiMock,
  useStore: () => ({ state: { bots: [], sections: [], instances: [] } as unknown as AppState, dispatch: vi.fn() }),
}));
vi.mock("./lazy-screens", () => ({ NewBotDialog: () => null }));
vi.mock("./GrokImportFlow", () => ({ GrokImportFlow: () => null }));

const { TeamLibraryPanel } = await import("./TeamLibraryPanel");
const { setLocale } = await import("@/lib/i18n");
const { locales } = await import("@/locales");

let container: HTMLDivElement;
let root: Root;
let closed: ReturnType<typeof vi.fn<() => void>>;

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const mount = async () => {
  closed = vi.fn<() => void>();
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(TeamLibraryPanel, {
      onClose: closed,
      onImported: vi.fn(),
      returnFocusRef: { current: null },
    }));
  });
  await flush();
};

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  apiMock.mockClear();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container.remove();
  document.body.innerHTML = "";
  setLocale("en");
});

describe("the Templates dialog shell", () => {
  it("takes the Apps dialog's surface, header rhythm and actions", async () => {
    await mount();
    const panel = dialog();
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(panel.getAttribute("aria-labelledby")).toBe("team-library-title");
    expect(panel.className).toContain("glass-surface");
    expect(panel.className).toContain("glass-popup");
    expect(panel.className).toContain("max-w-[780px]");
    expect(panel.className).toContain("rounded-2xl");
    expect(panel.className).toContain("overflow-hidden");

    const title = document.getElementById("team-library-title")!;
    expect(title.textContent).toBe("Templates");
    expect(title.className).toContain("text-[20px]");
    expect(title.className).toContain("leading-7");

    const header = panel.querySelector("header")!;
    expect(header.className).toContain("px-5");
    expect(header.className).toContain("pb-4");
    expect(header.className).toContain("pt-5");
    expect(header.className).toContain("sm:px-7");
    expect(header.className).toContain("sm:pt-6");

    const close = byLabel("Close templates")!;
    expect(close.className).toContain("size-8");
    expect(close.className).toContain("rounded-full");
    const search = byLabel("Search templates")!;
    expect(header.contains(search)).toBe(false);
    expect(panel.contains(search)).toBe(true);
    const repo = byLabel("Open the community templates repository")!;
    expect(header.contains(repo)).toBe(false);
    expect(repo.closest("[data-templates-grid]")).not.toBeNull();
    expect(repo.className).toContain("text-[13px]");
  });

  it("presents the sources as the Apps filter pills, not a chunky tablist", async () => {
    await mount();
    expect(document.querySelector('[role="tablist"]')).toBeNull();
    const group = document.querySelector<HTMLElement>('[role="group"][aria-label="Template source"]')!;
    expect(group.className).toContain("flex-wrap");
    const tabs = [...group.querySelectorAll<HTMLButtonElement>("button")];
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Explore", "Import", "From a folder", "Share"]);
    for (const tab of tabs) {
      expect(tab.className).toContain("h-7");
      expect(tab.className).toContain("rounded-full");
      expect(tab.className).toContain("text-[13px]");
    }
    expect(tabs[0]!.getAttribute("aria-pressed")).toBe("true");
    expect(tabs[0]!.className).toContain("bg-ink");

    await act(async () => tabs[1]!.click());
    expect(tabs[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(tabs[0]!.getAttribute("aria-pressed")).toBe("false");
    expect(document.body.textContent).toContain("Bring your own team");
    expect(document.body.textContent).toContain("Choose a backup or team file");
  });

  it("uses the Apps search pill and keeps its value when switching sources", async () => {
    await mount();
    const input = byLabel("Search templates") as HTMLInputElement;
    const pill = input.parentElement!;
    expect(pill.className).toContain("h-8");
    expect(pill.className).toContain("rounded-[var(--radius-lg)]");
    expect(pill.className).toContain("pl-2.5");
    expect(pill.className).toContain("pr-1");
    expect(pill.className).toContain("bg-control/70");
    expect(pill.className).toContain("focus-within:ring-1");
    expect(pill.className).toContain("focus-within:ring-accent");

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setValue.call(input, "sales");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => (document.querySelector('[data-template-tab="import"]') as HTMLButtonElement).click());
    await act(async () => (document.querySelector('[data-template-tab="explore"]') as HTMLButtonElement).click());
    expect((byLabel("Search templates") as HTMLInputElement).value).toBe("sales");
  });

  it("is a labelled modal that closes on Escape", async () => {
    await mount();
    expect(document.activeElement).toBe(dialog());
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside the dialog", async () => {
    await mount();
    const focusable = [...dialog().querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])")];
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    last.focus();
    expect(document.activeElement).toBe(last);
    await act(async () => {
      last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    });
    expect(document.activeElement).toBe(first);
  });

  it("renders every visible string from the Japanese pack", async () => {
    setLocale("ja");
    await mount();
    const pack = locales.ja!;
    expect(document.getElementById("team-library-title")!.textContent).toBe(pack["templates.title"]);
    expect(byLabel(pack["templates.close"]!)).not.toBeNull();
    expect(document.body.textContent).toContain(pack["templates.explore"]!);
    expect(document.body.textContent).toContain(pack["templates.import"]!);
    expect(document.body.textContent).toContain(pack["teamLibrary.shareTab"]!);
    expect((byLabel(pack["templates.search"]!) as HTMLInputElement).placeholder).toBe(pack["templates.search"]);
  });
});

describe("the Templates dialog i18n", () => {
  it("has the new menu and JSON keys in every shipped locale", () => {
    for (const [code, pack] of Object.entries(locales)) {
      expect(pack["thread.menu.delete"], code).toBeTruthy();
      expect(pack["templates.invalidJson"], code).toBeTruthy();
      expect(pack["thread.menu.delete"], code).toBe(pack["common.delete"]);
      expect(pack["task.deleteAria"], code).toBeTruthy();
    }
    expect(locales.en!["thread.menu.delete"]).toBe("Delete");
    expect(locales.en!["templates.invalidJson"]).toBe("That backup or team file is not valid JSON.");
  });
});
