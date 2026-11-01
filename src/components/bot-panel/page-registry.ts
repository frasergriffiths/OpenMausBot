import type { LocaleKey } from "@/locales";
import type { BotSettingsSection } from "@/state/store";

export const PANEL_TABS = ["computer", "profile", "library"] as const;
export type PanelTab = (typeof PANEL_TABS)[number];

export const TAB_LABEL: Record<PanelTab, LocaleKey> = {
  profile: "botPanel.tab.profile",
  library: "botPanel.tab.library",
  computer: "botPanel.tab.computer",
};

export type PageId =
  | "settings"
  | "setup" | "model" | "instructions" | "approvals" | "always" | "routines" | "apps"
  | "memory" | "skills" | "files" | "usage"
  | "browser" | "computer" | "folder" | "android"
  | "voice" | "blurb" | "team" | "chiefteams" | "mcp" | "tools" | "webhooks" | "visibility" | "slack"
  | "overview" | "prompt" | "history";

/** The pages Simple mode draws; a link to any other page lands where its section does. */
export const SIMPLE_PAGES = ["apps", "routines", "memory", "skills", "folder", "browser", "computer", "settings", "files", "android", "usage"] as const satisfies readonly PageId[];
export type SimplePageId = (typeof SIMPLE_PAGES)[number];

export function isSimplePage(page: PageId): page is SimplePageId {
  return (SIMPLE_PAGES as readonly PageId[]).includes(page);
}

export interface PageMeta {
  title: LocaleKey;
  home: PanelTab;
  intro?: LocaleKey;
}

export const PAGES: Record<PageId, PageMeta> = {
  settings: { title: "botPanel.page.settings", home: "profile" },
  setup: { title: "botSetup.ideas", home: "profile" },
  model: { title: "model.simple.model", home: "profile" },
  instructions: { title: "botSettings.simple.instructions", home: "profile" },
  approvals: { title: "botPanel.page.approvals", home: "profile" },
  routines: { title: "botSettings.simple.routines", home: "profile" },
  apps: { title: "botPanel.appsRow", home: "profile", intro: "botPanel.apps.intro" },
  memory: { title: "botPanel.memoryRow", home: "library", intro: "botPanel.memory.intro" },
  skills: { title: "botSettings.simple.skills", home: "library", intro: "botSettings.simple.skillsHint" },
  files: { title: "botPanel.library.files", home: "library" },
  usage: { title: "settings.section.usage", home: "profile" },
  browser: { title: "botPanel.page.browser", home: "computer" },
  computer: { title: "computer.tab.computer", home: "computer" },
  folder: { title: "computer.files.folder", home: "library", intro: "botPanel.folder.intro" },
  android: { title: "botPanel.page.android", home: "computer" },
  voice: { title: "botPanel.page.voice", home: "profile" },
  blurb: { title: "botPanel.page.blurb", home: "profile" },
  team: { title: "botPanel.page.team", home: "profile" },
  chiefteams: { title: "botPanel.page.chiefTeams", home: "profile" },
  mcp: { title: "connectors.tab.mcp", home: "profile" },
  tools: { title: "botAccess.tools.title", home: "profile" },
  webhooks: { title: "botPanel.page.webhooks", home: "profile" },
  always: { title: "botPanel.page.always", home: "profile" },
  visibility: { title: "botSettings.visibility.title", home: "profile" },
  slack: { title: "botPanel.page.slack", home: "profile" },
  overview: { title: "botPanel.page.overview", home: "profile" },
  prompt: { title: "botPanel.page.prompt", home: "profile" },
  history: { title: "botPanel.page.history", home: "profile" },
};

export const PAGE_IDS = Object.keys(PAGES) as PageId[];

export interface PanelTarget {
  tab: PanelTab;
  page?: SimplePageId;
  anchor?: string;
  /** Opens the Instructions editor in place on the Bot settings page. */
  editInstructions?: boolean;
}

const SECTION_TARGET: Record<BotSettingsSection, PanelTarget> = {
  overview: { tab: "profile" },
  identity: { tab: "profile" },
  slack: { tab: "profile" },
  soul: { tab: "profile", page: "settings", anchor: "instructions", editInstructions: true },
  skills: { tab: "library", page: "skills" },
  memory: { tab: "library", page: "memory" },
  access: { tab: "computer" },
  model: { tab: "profile", anchor: "model" },
  permissions: { tab: "profile", page: "settings", anchor: "approval" },
  voice: { tab: "profile" },
  visibility: { tab: "profile" },
  history: { tab: "profile" },
  usage: { tab: "profile" },
};

export function sectionTarget(section: BotSettingsSection): PanelTarget {
  return SECTION_TARGET[section];
}
