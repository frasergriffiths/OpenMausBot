import { describe, expect, it } from "vitest";

import en from "@/locales/en.json";
import { BOT_SECTIONS } from "../bot-settings/sections";
import { isSimplePage, PAGE_IDS, PAGES, PANEL_TABS, sectionTarget, SIMPLE_PAGES, TAB_LABEL } from "./page-registry";

describe("the bot panel's page registry", () => {
  it("has three tabs: Profile, Library and Computer", () => {
    expect(PANEL_TABS).toEqual(["profile", "library", "computer"]);
  });

  it("lands every settings section on a tab, and on a Simple page that lives on that tab", () => {
    for (const { id } of BOT_SECTIONS) {
      const target = sectionTarget(id);
      expect(PANEL_TABS).toContain(target.tab);
      if (target.page) {
        expect(isSimplePage(target.page), id).toBe(true);
        expect(PAGES[target.page].home, id).toBe(target.tab);
      }
    }
  });

  it.each([
    ["overview", { tab: "profile" }], ["identity", { tab: "profile" }],
    ["soul", { tab: "profile", page: "settings", anchor: "instructions", editInstructions: true }],
    ["skills", { tab: "library", page: "skills" }], ["memory", { tab: "library", page: "memory" }], ["routines", { tab: "profile", page: "routines" }],
    ["access", { tab: "computer" }], ["model", { tab: "profile", anchor: "model" }], ["permissions", { tab: "profile", page: "settings", anchor: "approval" }],
    ["voice", { tab: "profile" }], ["visibility", { tab: "profile" }], ["history", { tab: "profile" }], ["usage", { tab: "profile" }], ["slack", { tab: "profile" }],
  ] as const)("sends a %s link to %o", (section, target) => {
    expect(sectionTarget(section)).toEqual(target);
  });

  it("draws the Simple pages on their tabs: settings on Profile, what it keeps on Library, where it works on Computer", () => {
    expect(SIMPLE_PAGES).toEqual([
      "apps", "routines", "memory", "skills", "folder", "browser", "computer", "where", "settings",
      "threads", "activity", "runlog", "files", "data", "sites", "android", "usage",
    ]);
    const home = Object.fromEntries(SIMPLE_PAGES.map((page) => [page, PAGES[page].home]));
    expect(home).toEqual({
      apps: "profile", routines: "profile", settings: "profile", threads: "profile", activity: "profile", runlog: "profile", usage: "profile",
      memory: "library", skills: "library", folder: "library", files: "library", data: "library",
      browser: "computer", computer: "computer", where: "computer", sites: "computer", android: "computer",
    });
    expect(isSimplePage("mcp")).toBe(false);
  });

  it("names every page, its intro and every tab in English copy", () => {
    const keys = en as Record<string, string>;
    for (const id of PAGE_IDS) {
      expect(keys[PAGES[id].title], id).toBeTruthy();
      if (PAGES[id].intro) expect(keys[PAGES[id].intro], id).toBeTruthy();
    }
    for (const tab of PANEL_TABS) expect(keys[TAB_LABEL[tab]]).toBeTruthy();
    expect(PANEL_TABS.map((tab) => keys[TAB_LABEL[tab]])).toEqual(["Profile", "Library", "Computer"]);
    expect(keys[PAGES.settings.title]).toBe("Bot settings");
  });
});
