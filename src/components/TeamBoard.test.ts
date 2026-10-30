import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
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

const render = (sections: TeamMapSection<Bot>[]) => renderToStaticMarkup(createElement(TeamBoard, {
  sections, canManage: true, onMove: async () => true, onInstructions: vi.fn(), onMemory: vi.fn(),
  onEditTeam: vi.fn(), onDeleteTeam: vi.fn(), onComputer: vi.fn(),
}));
const menuItems = (markup: string) => [...markup.matchAll(/<button[^>]*role="menuitem"[^>]*>(.*?)<\/button>/g)]
  .map((match) => match[1].replace(/<[^>]+>/g, "").trim());

describe("the Team map board", () => {
  it("renders one readable panel per department with the shared menu order", () => {
    fixture.bots = [bot("ada", "Ada", "Engineering"), bot("ben", "Ben", "Engineering")];
    fixture.sections = ["Engineering"];
    const markup = render([section("Engineering", "Engineering", fixture.bots)]);
    expect(markup).toContain("Engineering");
    expect(markup).toContain("2 bots");
    expect(markup).toContain("Edit Ada");
    expect(menuItems(markup).slice(0, 5)).toEqual(["Department memory", "Shared instructions", "Manage bots…", "Rename department", "Delete"]);
    expect(markup).not.toContain("Zoom in");
    expect(markup).not.toContain("Fit departments to view");
  });

  it("names the drag destination in an empty department", () => {
    fixture.bots = [bot("ada", "Ada", "Engineering")];
    fixture.sections = ["Engineering", "Delivery"];
    const markup = render([section("Engineering", "Engineering", fixture.bots), section("Delivery", "Delivery", [])]);
    expect(markup).toContain("Drag a bot here to move it into Delivery.");
    expect(markup).toContain("0 bots");
  });

  it("offers one New bot when the workspace has no bots", () => {
    fixture.bots = [];
    fixture.sections = [];
    const markup = render([section("", "General", [])]);
    expect(markup).toContain("No bots yet");
    expect(markup).toContain("Create a bot and it will appear here.");
    expect(markup).toContain("New Bot");
    expect(markup).not.toContain("Drag a bot here");
  });
});
