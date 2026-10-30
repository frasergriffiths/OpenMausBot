// @vitest-environment happy-dom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bot } from "@/state/store";
import type { TeamMapSection } from "@/lib/team-map";

const fixture = vi.hoisted(() => ({ bots: [] as Bot[], sections: [] as string[], dispatch: vi.fn() }));
vi.mock("@/lib/thread-preferences", () => ({ useShowThreads: () => true }));
vi.mock("@/state/store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/state/store")>();
  return { ...original, api: vi.fn(async () => ({ environmentId: "test" })), useStore: () => ({
    state: { ...original.initialState, bots: fixture.bots, sections: fixture.sections, groups: [], instances: [], settingsOpen: false, selectedId: null },
    dispatch: fixture.dispatch,
  }) };
});
const { TeamBoard } = await import("./TeamBoard");

const bot = (id: string, name: string, section?: string, chiefOfStaff = false): Bot => ({
  id, threadId: id + "-chat", name, title: "Builds things", description: "", notifications: true, color: "green", unread: false,
  messages: [], section, chiefOfStaff, modelSelection: { instanceId: "fake", model: "test" },
  tasks: [{ threadId: id + "-chat", title: "Chat", createdAt: 1 }],
});
const section = (key: string, name: string, members: Bot[]): TeamMapSection<Bot> => ({ key, name, chiefs: [], members });

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  flushSync(() => root?.unmount());
  host.remove();
  document.body.innerHTML = "";
});

const render = (sections: TeamMapSection<Bot>[]) => {
  root = createRoot(host);
  flushSync(() => root.render(createElement(TeamBoard, {
    sections, canManage: true, onMove: async () => true, onInstructions: vi.fn(), onMemory: vi.fn(),
    onEditTeam: vi.fn(), onDeleteTeam: vi.fn(), onComputer: vi.fn(),
  })));
  return host.textContent ?? "";
};
const openMenu = (name: string) => {
  const summary = host.querySelector<HTMLElement>(`summary[aria-label="Manage ${name} department"]`);
  if (!summary) throw new Error("missing department menu");
  const details = summary.closest("details")!;
  details.setAttribute("open", "");
  details.dispatchEvent(new Event("toggle"));
  flushSync(() => {});
};
const menuItems = () => [...document.querySelectorAll<HTMLElement>("[data-team-menu] [role=menuitem]")];

describe("the Team map board", () => {
  it("renders one readable panel per department with the shared menu order", () => {
    fixture.bots = [bot("ada", "Ada", "Engineering"), bot("ben", "Ben", "Engineering")];
    fixture.sections = ["Engineering"];
    const text = render([section("Engineering", "Engineering", fixture.bots)]);
    expect(text).toContain("Engineering");
    expect(text).toContain("2 bots");
    expect(host.querySelector('[aria-label="Edit Ada"]')).not.toBeNull();
    expect(text).not.toContain("Zoom in");
    expect(text).not.toContain("Fit departments to view");

    openMenu("Engineering");
    expect(menuItems().map((item) => item.textContent?.trim())).toEqual([
      "Department memory", "Shared instructions", "Manage bots…", "Rename department", "Delete",
    ]);
    expect(document.activeElement?.textContent?.trim()).toBe("Department memory");
    menuItems()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    expect(document.activeElement?.textContent?.trim()).toBe("Shared instructions");
    menuItems()[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    flushSync(() => {});
    expect(document.querySelector("[data-team-menu]")).toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Manage Engineering department");
  });

  it("labels the ungrouped panel's dialog as a move, not a manage", () => {
    fixture.bots = [bot("ada", "Ada", "Engineering")];
    fixture.sections = ["Engineering"];
    render([section("Engineering", "Engineering", fixture.bots), section("", "General", [])]);
    openMenu("General");
    expect(menuItems().map((item) => item.textContent?.trim())).toContain("Move bots to General");
    expect(menuItems().map((item) => item.textContent?.trim())).not.toContain("Manage bots…");
  });

  it("names the drag destination in an empty department", () => {
    fixture.bots = [bot("ada", "Ada", "Engineering")];
    fixture.sections = ["Engineering", "Delivery"];
    const text = render([section("Engineering", "Engineering", fixture.bots), section("Delivery", "Delivery", [])]);
    expect(text).toContain("Drag a bot here to move it into Delivery.");
    expect(text).toContain("0 bots");
  });

  it("offers one New bot when the workspace has no bots", () => {
    fixture.bots = [];
    fixture.sections = [];
    const text = render([section("", "General", [])]);
    expect(text).toContain("No bots yet");
    expect(text).toContain("Create a bot and it will appear here.");
    expect(text).toContain("New Bot");
    expect(text).not.toContain("Drag a bot here");
  });
});
