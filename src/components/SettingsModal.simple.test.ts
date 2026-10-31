import { readFileSync } from "node:fs";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setLocale, t } from "@/lib/i18n";
import type { AppSettingsSection } from "@/state/store";
import type { Switch } from "./ui";
import { SECTIONS, SIMPLE_FOLDED, SIMPLE_HIDDEN_SECTIONS, SIMPLE_PAGES, SettingsModal, revealSettingsBlock } from "./SettingsModal";

const fixture = vi.hoisted(() => ({
  section: "general" as AppSettingsSection,
  config: { features: { browser: false }, browserEngine: { kind: "bundled", installable: true }, composio: { mode: "self" } } as Record<string, unknown>,
  api: vi.fn(),
  dispatch: vi.fn(),
  switches: [] as ComponentProps<typeof Switch>[],
  ownerOrAdmin: null as boolean | null,
  updater: null as import("@/lib/updater").UpdaterState | null,
  serverUpdate: null as ReturnType<typeof import("./SidebarProfileMenu").useServerUpdateItem>,
}));

vi.mock("./DesktopCapabilities", () => ({ useDesktopCapabilities: () => ({ capabilities: {} }) }));
vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  api: fixture.api,
  useStore: () => ({ state: { appSettingsSection: fixture.section, instances: [], bots: [], config: fixture.config }, dispatch: fixture.dispatch }),
}));
vi.mock("@/lib/analytics", () => ({ analyticsEnabled: () => false, setAnalyticsEnabled: vi.fn() }));
vi.mock("@/lib/use-owner-or-admin", () => ({ useOwnerOrAdmin: () => fixture.ownerOrAdmin }));
vi.mock("./ui", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ui")>();
  return {
    ...original,
    Switch: (props: ComponentProps<typeof Switch>) => {
      fixture.switches.push(props);
      return createElement(original.Switch, props);
    },
  };
});
// Each page's own content has its own tests; here a marker says which ran.
const { marker } = vi.hoisted(() => ({
  marker: (name: string) => () => `MARKER:${name};`,
}));
vi.mock("./EnginesSettings", () => ({ EnginesSettings: marker("engines") }));
vi.mock("./DecisionModelSettings", () => ({ DecisionModelSettings: marker("decisionModel") }));
vi.mock("./SkillsSection", () => ({ SkillsSection: marker("skills") }));
vi.mock("./CacheKeepWarmSettings", () => ({ CacheKeepWarmSettings: marker("keepWarm") }));
vi.mock("./McpCallTimeoutSettings", () => ({ McpCallTimeoutSettings: marker("mcpCalls") }));
vi.mock("./ThreadConcurrencySettings", () => ({ ThreadConcurrencySettings: marker("threads") }));
vi.mock("./AutomaticRecoverySettings", () => ({ AutomaticRecoverySettings: marker("recovery") }));
vi.mock("./ThreadCleanupSettings", () => ({ ThreadCleanupSettings: marker("threadCleanup") }));
vi.mock("./NewBotDialog", () => ({ DefaultBotSettings: marker("defaults"), NewBotDialog: marker("newBotDialog") }));
vi.mock("./ApiKeys", () => ({
  ApiKeyRow: marker("apiKey"),
  AnthropicEveryClaudeBot: marker("anthropicEvery"),
  OpenAiCompatUrl: marker("compatUrl"),
  OpenCodeProviderKeys: marker("opencodeProviderKeys"),
  VpsConnection: marker("vps"),
}));
vi.mock("./RemoteComputerSection", () => ({ RemoteComputerSection: marker("companion") }));
vi.mock("./CustomDomainSettings", () => ({ CustomDomainSettings: () => null }));
vi.mock("./CompanionSection", () => ({ CompanionSection: () => null }));
vi.mock("./ServerPairingCard", () => ({ ServerPairingCard: () => null }));
vi.mock("./ConnectedWorkspacesSettings", () => ({ ConnectedWorkspacesSettings: marker("desktopWorkspaces") }));
vi.mock("./LocalComputerSection", () => ({ LocalComputerSection: marker("computer") }));
vi.mock("./CloudAccountSettings", () => ({ CloudAccountSettings: marker("cloudAccount") }));
vi.mock("./PeopleSection", () => ({ PeopleSection: marker("people") }));
vi.mock("./ActivitySection", () => ({ ActivitySection: marker("activity") }));
vi.mock("./UsageSection", () => ({ UsageSection: marker("usage") }));
vi.mock("./WorkspaceBackupSettings", () => ({ WorkspaceBackupSettings: marker("backups") }));
vi.mock("./RoomTurnTimeoutSettings", () => ({ RoomTurnTimeoutSettings: marker("roomTurns") }));
vi.mock("./CompanyBackupSettings", () => ({ CompanyBackupSettings: () => null }));
vi.mock("./ImportSettings", () => ({ ImportSettings: marker("import") }));
vi.mock("./WorkspacesSection", () => ({ WorkspacesSection: marker("workspaces"), workspacesAvailable: () => true }));
vi.mock("./UpdatesConsent", async (importOriginal) => ({
  ...await importOriginal<typeof import("./UpdatesConsent")>(),
  UpdatesConsentRow: marker("updatesConsent"),
}));
vi.mock("./SidebarProfileMenu", async (importOriginal) => ({
  ...await importOriginal<typeof import("./SidebarProfileMenu")>(),
  useServerUpdateItem: () => fixture.serverUpdate,
}));
vi.mock("@/lib/updater", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/updater")>(),
  useUpdaterState: () => fixture.updater,
}));

const desktop = { ogb: { environments: {}, organization: {}, cloudAccount: {} } };

beforeEach(() => {
  vi.clearAllMocks();
  fixture.section = "general";
  fixture.config = { features: { browser: false }, browserEngine: { kind: "bundled", installable: true }, composio: { mode: "self" } };
  fixture.switches = [];
  fixture.ownerOrAdmin = null;
  fixture.updater = null;
  fixture.serverUpdate = null;
  fixture.api.mockResolvedValue({});
  vi.stubGlobal("window", desktop);
  vi.stubGlobal("document", { documentElement: { dataset: {} } });
  setLocale("en");
});

afterEach(() => {
  vi.unstubAllGlobals();
  setLocale("en");
});

const render = () => renderToStaticMarkup(createElement(SettingsModal));
const pages = (html: string) => [...html.matchAll(/data-settings-page="([^"]+)"/g)].map((match) => match[1]);
const currentPage = (html: string) => html.match(/data-settings-page="([^"]+)" aria-current="page"/)?.[1];
const blocks = (html: string) => [...html.matchAll(/data-settings-block="([^"]+)"/g)].map((match) => match[1]);
const markers = (html: string) => [...html.matchAll(/MARKER:([^;]+);/g)].map((match) => match[1]);
const groupLabels = (html: string) => [...html.matchAll(/<h3 id="[^"]*" class="[^"]*">([^<]+)<\/h3>/g)].map((match) => match[1]);

/** Where each folded region (`hidden`) starts and ends in the markup. */
function foldedRanges(html: string): Array<[number, number]> {
  return [...html.matchAll(/<div[^>]*\bhidden=""[^>]*>/g)].map((open) => {
    const tags = /<\/?div\b[^>]*>/g;
    tags.lastIndex = open.index! + open[0].length;
    let depth = 1;
    for (let tag = tags.exec(html); tag && depth > 0; tag = depth > 0 ? tags.exec(html) : null) depth += tag[0].startsWith("</") ? -1 : 1;
    return [open.index!, tags.lastIndex];
  });
}
const placement = (html: string, needle: string): "shown" | "folded" | "missing" => {
  const at = html.indexOf(needle);
  if (at < 0) return "missing";
  return foldedRanges(html).some(([from, to]) => at > from && at < to) ? "folded" : "shown";
};
const open = (section: AppSettingsSection) => { fixture.section = section; return render(); };

describe("Settings, the one plain UI", () => {
  it("draws nine pages in the split order and no section rail", () => {
    const html = render();
    const order = ["account", "appearance", "data", "ai", "skills", "keys", "computer", "billing", "updates"];
    expect(pages(html)).toEqual(order);
    expect(SIMPLE_PAGES.map((page) => page.id)).toEqual(order);
    expect(html).not.toContain("data-settings-group=");
    expect(html).not.toContain("data-settings-section=");
    expect(html).toContain('data-settings-look="simple"');
    expect(html).not.toMatch(/Advanced mode/);
  });

  it("gives every page a description line under its title", () => {
    expect(SIMPLE_PAGES.map((page) => page.descriptionKey)).toEqual([
      "settings.simple.page.account.description",
      "settings.simple.page.appearance.description",
      "settings.simple.page.data.description",
      "settings.simple.page.ai.description",
      "settings.simple.page.skills.description",
      "settings.simple.page.keys.description",
      "settings.simple.page.computer.description",
      "settings.simple.page.billing.description",
      "settings.simple.page.updates.description",
    ]);
    expect(render()).toContain(t("settings.simple.page.account.description"));
  });

  it("places every section on a page, with none left over", () => {
    const placed = SIMPLE_PAGES.flatMap((page) => page.sections);
    expect(new Set(placed).size).toBe(placed.length);
    const unplaced = SECTIONS.map((entry) => entry.id).filter((id) => !placed.includes(id) && id !== "updates");
    expect(unplaced).toEqual([]);
    expect(SIMPLE_HIDDEN_SECTIONS).toEqual([]);
  });

  it("opens Account on the profile, the plan, People, System and Limits", () => {
    const html = render();
    expect(currentPage(html)).toBe("account");
    expect(groupLabels(html)).toEqual(["System", "Limits and recovery"]);
    expect(html).toContain("Add your name");
    expect(html).not.toContain('data-settings-disclosure="general-backups"');
  });

  it("keeps Appearance, Sidebar, notifications and Backups on their own pages", () => {
    const appearance = open("appearance");
    expect(currentPage(appearance)).toBe("appearance");
    expect(groupLabels(appearance)).toEqual(["Notifications"]);
    expect(appearance).toContain("Sidebar");
    expect(appearance).toContain('data-settings-disclosure="general-sidebar"');
    const data = open("backups");
    expect(currentPage(data)).toBe("data");
    expect(groupLabels(data)).toEqual(["Import"]);
    expect(data).toContain('data-settings-disclosure="general-backups"');
    expect(data).toContain("Export or restore every bot, chat and setting in one encrypted file.");
  });

  it("keeps the everyday rows and every merged control reachable by its own page", () => {
    const account = open("general");
    expect(placement(account, 'aria-label="Send usage analytics"')).toBe("shown");
    expect(markers(account)).toEqual(expect.arrayContaining(["roomTurns", "threads", "recovery", "threadCleanup"]));
    const appearance = open("appearance");
    for (const shown of ['aria-label="Color my messages with the bot&#x27;s color"', 'aria-label="Send messages with"',
      'aria-label="Notification sounds"', 'aria-label="Show the notification feed"', 'aria-label="App language"', 'role="radiogroup" aria-label="Theme"']) {
      expect(placement(appearance, shown), shown).toBe("shown");
    }
    // The density setting went with the compact layout: the sidebar's own toggle is the only way to the icons rail.
    expect(placement(appearance, 'aria-label="Choose sidebar density"')).toBe("missing");
    const ai = open("engines");
    expect(markers(ai)).toEqual(expect.arrayContaining(["engines", "keepWarm", "decisionModel", "mcpCalls", "defaults"]));
    expect(ai).toContain('aria-label="Effort for new bots"');
    expect(open("updates")).toContain("MARKER:updatesConsent;");
  });

  it("names the version on Updates, then product updates, the welcome tour and diagnostics", () => {
    vi.stubGlobal("window", { ogb: { ...desktop.ogb, updater: { check: vi.fn(), install: vi.fn(), onState: vi.fn() } } });
    fixture.updater = { status: "idle" };
    const html = open("updates");
    expect(html).toMatch(/>OpenMausBot [^<]+<\/div>/);
    for (const shown of ["Check for updates", "MARKER:updatesConsent;", "Replay welcome tour", "Diagnostics"]) expect(placement(html, shown), shown).toBe("shown");
  });

  it("checks the server's version from a browser", () => {
    vi.stubGlobal("window", {});
    const onSelect = vi.fn();
    fixture.serverUpdate = { phase: "up-to-date", pending: false, label: "Up to date", item: { key: "update", label: "Up to date", subtitle: "v1.2.3", icon: null, disabled: false, onSelect } };
    const html = open("updates");
    expect(html).toMatch(/>OpenMausBot [^<]+<\/div>/);
    expect(html).toContain("Up to date v1.2.3");
    expect(placement(html, "Check for updates")).toBe("shown");
  });

  it("opens the fold that holds a linked setting: Servers or this app as a client", () => {
    expect(placement(open("connections"), "MARKER:apiKey;")).toBe("shown");
    expect(placement(open("engines"), "MARKER:apiKey;")).toBe("missing");
    expect(placement(open("desktopWorkspaces"), "MARKER:desktopWorkspaces;")).toBe("shown");
    expect(placement(open("remote"), "MARKER:companion;")).toBe("shown");
    expect(placement(open("companion"), "MARKER:companion;")).toBe("folded");
    expect(SIMPLE_FOLDED).toEqual({ remote: "computer-elsewhere", desktopWorkspaces: "computer-elsewhere" });
  });

  it("names the skills page Experimental once, and leads its description with the early features", () => {
    const html = open("skills");
    const nav = html.slice(html.indexOf('data-settings-page="skills"'));
    expect(nav.slice(0, nav.indexOf("</button>"))).toContain(">Experimental<");
    expect(SIMPLE_PAGES.find((page) => page.id === "skills")?.labelKey).toBe("settings.section.experimental");
    expect(t("settings.simple.page.skills.description")).toBe("Early features you can switch on, plus what your bots know and how they learn.");
    expect(readFileSync(new URL("./AppSettingsRows.tsx", import.meta.url), "utf8")).not.toContain("settings.experimental.title");
  });

  it("lands a deep link to the skills library on Skills when the library is on", () => {
    fixture.config = { ...fixture.config, features: { browser: false, skillsLibrary: true } };
    const html = open("skills");
    expect(currentPage(html)).toBe("skills");
    expect(blocks(html)).toContain("skills");
    expect(markers(html)).toContain("skills");
  });

  it("gives API keys and connectors their own page outside the AI group", () => {
    fixture.section = "connections";
    const html = render();
    expect(currentPage(html)).toBe("keys");
    expect(blocks(html)).toEqual(["connections"]);
    expect(html).toContain("MARKER:apiKey;");
    expect(groupLabels(html)).toEqual([]);
  });

  it("orders Computer as your bots' computers, your devices, the browser, logins, then Connect from elsewhere", () => {
    fixture.section = "companion";
    const html = render();
    expect(currentPage(html)).toBe("computer");
    expect(blocks(html)).toEqual(["computer", "companion", "browser", "logins", "elsewhere", "remote", "desktopWorkspaces", "workspaces"]);
    expect(groupLabels(html)).toEqual(["Your bots’ computers", "Your devices", "Built-in browser"].map((label) => label.replace("’", "&#x27;")));
    expect(html).toContain('aria-label="Enable the built-in browser"');
    expect(html).toContain("MARKER:workspaces;");
  });

  it("leads Usage & billing with one usage block, folds the limits, then shows the plan", () => {
    fixture.section = "cloudAccount";
    const html = render();
    expect(currentPage(html)).toBe("billing");
    expect(blocks(html)).toEqual(["usage", "cloudAccount"]);
    expect(html.indexOf("See all limits")).toBeLessThan(html.indexOf("MARKER:cloudAccount;"));
    expect(placement(html, "MARKER:usage;")).toBe("folded");
    expect(groupLabels(html)).toContain("Plan");
  });

  it("shows a hosted workspace's admins People in Account and Activity as its own group on Data", () => {
    vi.stubGlobal("window", {});
    fixture.ownerOrAdmin = true;
    fixture.section = "people";
    const html = render();
    expect(pages(html)).toEqual(["account", "appearance", "data", "ai", "skills", "keys", "computer", "billing", "updates"]);
    expect(currentPage(html)).toBe("account");
    expect(placement(html, "MARKER:people;")).toBe("shown");
    expect(placement(html, "MARKER:activity;")).toBe("missing");
    const data = open("activity");
    expect(currentPage(data)).toBe("data");
    expect(placement(data, "MARKER:activity;")).toBe("shown");
    expect(groupLabels(data)).toContain("Activity");
  });

  it("keeps a paired remote client's reduced set: Appearance, and Computer with your devices and Connect from elsewhere", () => {
    vi.stubGlobal("window", { ogb: { ...desktop.ogb, remoteClient: { active: true } } });
    fixture.section = "desktopWorkspaces";
    const html = render();
    expect(pages(html)).toEqual(["appearance", "computer"]);
    expect(currentPage(html)).toBe("computer");
    expect(blocks(html)).toEqual(["companion", "elsewhere", "remote", "desktopWorkspaces", "workspaces"]);
    expect(html).not.toContain('aria-label="Enable the built-in browser"');
    fixture.section = "appearance";
    const appearance = render();
    expect(currentPage(appearance)).toBe("appearance");
    expect(appearance).not.toContain("Add your name");
    expect(appearance).toContain('aria-label="App language"');
  });

  it.each<[AppSettingsSection, string]>([
    ["general", "account"],
    ["appearance", "appearance"],
    ["import", "data"],
    ["backups", "data"],
    ["experimental", "skills"],
    ["decisionModel", "ai"],
    ["engines", "ai"],
    ["connections", "keys"],
    ["companion", "computer"],
    ["remote", "computer"],
    ["desktopWorkspaces", "computer"],
    ["computer", "computer"],
    ["logins", "computer"],
    ["workspaces", "computer"],
    ["usage", "billing"],
    ["cloudAccount", "billing"],
    ["updates", "updates"],
  ])("lands a deep link to %s on %s", (section, page) => {
    fixture.section = section;
    const html = render();
    expect(currentPage(html)).toBe(page);
    expect(blocks(html)).toContain(section === "remote" ? "remote" : section);
  });

  it("scrolls a later section of a stacked page into view, and starts a page at its top", () => {
    const scrollIntoView = vi.fn();
    const querySelector = vi.fn(() => ({ scrollIntoView }));
    const scroller = { scrollTop: 320, querySelector };
    revealSettingsBlock(scroller, "connections", 1);
    expect(querySelector).toHaveBeenCalledWith('[data-settings-block="connections"]');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    revealSettingsBlock(scroller, "engines", 0);
    expect(scroller.scrollTop).toBe(0);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe("the built-in browser switch", () => {
  const browserSwitch = () => fixture.switches.find((props) => props["aria-label"] === "Enable the built-in browser");

  it("writes features.browser from Computer, below your bots' computers", async () => {
    fixture.section = "computer";
    const html = render();
    expect(html.indexOf("MARKER:computer;")).toBeLessThan(html.indexOf('aria-label="Enable the built-in browser"'));
    const toggle = browserSwitch()!;
    expect(toggle.checked).toBe(false);
    toggle.onClick!({} as never);
    await vi.waitFor(() => expect(fixture.dispatch).toHaveBeenCalledWith({ type: "configStatus", config: {} }));
    expect(fixture.api).toHaveBeenCalledWith("/api/config", {
      method: "PATCH",
      body: JSON.stringify({ features: { browser: true } }),
    });
  });

  it("is no longer on Experimental, which keeps skill drafting", () => {
    fixture.section = "experimental";
    const html = render();
    expect(html).not.toContain('aria-label="Enable the built-in browser"');
    expect(browserSwitch()).toBeUndefined();
  });
});
