import { useEffect, useRef, useState } from "react";
import { CloudDownload, Coins, Download, FlaskConical, KeyRound, LockKeyhole, Monitor, Palette, Sparkles, Terminal, User, UserRound, Users, X, Building2, Zap, BookOpen, MessageSquareText } from "lucide-react";
import { useStore, type AppSettingsSection } from "@/state/store";
import { skillsLibraryEnabled } from "@/lib/feature-flags";
import { type LocaleKey } from "@/locales";
import { t } from "@/lib/i18n";
import { SettingsCard } from "@/components/ui";
import { AnthropicEveryClaudeBot, ApiKeyRow, OpenCodeProviderKeys, VpsConnection } from "./ApiKeys";
import { LmStudioServer, OtherOpenAiCompatServers } from "./OpenAiCompatServers";
import { Notice } from "./Notice";
import { SmsSettings } from "./SmsSettings";
import { ConnectedWorkspacesSettings } from "./ConnectedWorkspacesSettings";
import { shortcutLabel } from "./ShortcutHint";
import { LicenseExpiryBanner } from "./LicenseExpiryBanner";
import { WorkspacesSection, workspacesAvailable } from "./WorkspacesSection";
import { Select } from "./Select";
import { SimpleAccountPage, SimpleAiPage, SimpleAppearancePage, SimpleComputerPage, SimpleImportPage, SimpleKeysPage, SimpleSkillsPage, SimpleUpdatesPage, type Disclose, type SimpleDisclosureId, type SimpleSettingsPage } from "./SettingsSimplePages";
import { cn } from "@/lib/cn";
import { glassPopupFrameStyle } from "@/lib/glass-popup";
import { Chevron } from "./chevron";

// labelKey, not a label: t() reads the active pack when called, so a label resolved at module scope would freeze the
// boot language.

export type SettingsGroup = "you" | "ai" | "keys" | "computers" | "account";

export const SETTINGS_GROUPS: Array<{ id: SettingsGroup; labelKey: LocaleKey }> = [
  { id: "you", labelKey: "settings.group.you" },
  { id: "ai", labelKey: "settings.group.ai" },
  { id: "keys", labelKey: "settings.group.keys" },
  { id: "computers", labelKey: "settings.group.computers" },
  { id: "account", labelKey: "settings.group.account" },
];

export const SECTIONS: Array<{
  id: AppSettingsSection;
  group: SettingsGroup;
  labelKey: LocaleKey;
  icon: typeof User;
  keywords: string[];
}> = [
  { id: "general", group: "you", labelKey: "settings.section.general", icon: User, keywords: ["profile", "name", "email", "about me", "about", "suggestions", "suggested", "memory", "analytics", "updates", "product updates", "newsletter", "email updates", "effort", "new bots", "reasoning", "threads", "parallel", "concurrency", "cleanup", "retention", "event log", "event-log", "log size", "automatic recovery", "backup model", "fallback", "conversation", "usage", "limit", "plan", "upgrade", "cloud desktop hours", "storage"] },
  { id: "appearance", group: "you", labelKey: "settings.section.appearance", icon: Palette, keywords: ["skin", "theme", "appearance", "chat width", "width", "wide", "full width", "bubble", "bubbles", "tools", "tool calls", "threads", "show threads", "hide threads", "sidebar", "density", "compact", "avatars", "display", "run", "this run", "run card", "commands", "notifications", "sound", "sounds", "mute", "silent", "chime", "pinned", "circles", "universal", "groups", "top", "send", "enter", "return", "shift+enter", "ctrl+enter", "cmd+enter", "⌘+enter", "new line", "keyboard", "ime", "japanese", "message color", "my messages", "toolbar", "tools layout", "footer", "team map"] },
  { id: "engines", group: "ai", labelKey: "settings.section.engines", icon: Terminal, keywords: ["models", "model providers", "engines", "claude", "codex", "grok", "providers", "cli", "sign in", "subscription"] },
  { id: "connections", group: "keys", labelKey: "settings.section.connections", icon: KeyRound, keywords: ["keys", "api", "api key", "api keys", "connections", "connectors", "composio", "provider keys", "box", "xai", "mistral", "cerebras", "meta", "muse", "vps", "router", "openrouter", "base url", "openai", "anthropic", "groq", "opencode", "deepseek", "provider", "lm studio", "lmstudio", "llm studio", "llmstudio", "bionic"] },
  { id: "sms", group: "keys", labelKey: "settings.section.sms", icon: MessageSquareText, keywords: ["sms", "text", "texts", "twilio", "phone", "messaging", "messages"] },
  { id: "decisionModel", group: "ai", labelKey: "settings.section.decisionModel", icon: Zap, keywords: ["decision", "extraction", "jev", "typesafe", "cloudflare", "workers ai", "clef", "clairic", "email", "routing", "auto", "rooms", "who answers"] },
  { id: "skills", group: "ai", labelKey: "settings.section.skills", icon: BookOpen, keywords: ["skills", "library", "assign", "agent skills", "skill md"] },
  { id: "desktopWorkspaces", group: "computers", labelKey: "settings.section.desktopWorkspaces", icon: Building2, keywords: ["workspace", "cloud", "hosted", "vps", "server", "servers", "connect", "pair", "switch", "local"] },
  { id: "computer", group: "computers", labelKey: "settings.section.computer", icon: Monitor, keywords: ["vm", "virtual", "desktop", "browser", "built-in browser", "profiles", "browser profiles"] },
  { id: "logins", group: "computers", labelKey: "settings.section.logins", icon: LockKeyhole, keywords: ["logins", "login", "passwords", "password", "sign in", "2fa", "one-time code", "totp", "fill_login", "1password", "vault"] },
  { id: "usage", group: "account", labelKey: "settings.section.usage", icon: Coins, keywords: ["tokens", "cost", "billing", "plan", "quota", "remaining", "weekly", "5-hour", "model", "used"] },
  { id: "import", group: "account", labelKey: "settings.section.import", icon: Download, keywords: ["import", "grok", "grok bot", "x.ai", "bring", "transfer"] },
  { id: "people", group: "account", labelKey: "settings.section.people", icon: Users, keywords: ["people", "users", "invite", "sign in", "members", "admins", "access"] },
  { id: "workspaces", group: "account", labelKey: "settings.section.workspaces", icon: Building2, keywords: ["clients", "tenants", "fleet", "workspaces", "installation", "installations"] },
  { id: "experimental", group: "account", labelKey: "settings.section.experimental", icon: FlaskConical, keywords: ["early", "preview", "learn", "skill", "authoring"] },
];

export type { SimpleSettingsPage };

export const SIMPLE_PAGES: SimpleSettingsPage[] = [
  { id: "account", labelKey: "settings.simple.page.account", descriptionKey: "settings.simple.page.account.description", icon: UserRound, sections: ["general", "people"],
    keywords: ["account", "profile", "plan", "people", "open at login", "startup", "analytics", "limits", "recovery"] },
  { id: "appearance", labelKey: "settings.section.appearance", descriptionKey: "settings.simple.page.appearance.description", icon: Palette, sections: ["appearance"],
    keywords: ["theme", "looks", "sidebar", "density", "notifications", "font", "chat width", "language", "send key"] },
  { id: "import", labelKey: "settings.section.import", descriptionKey: "settings.simple.page.import.description", icon: Download, sections: ["import"],
    keywords: ["import", "grok", "grok bot", "x.ai", "bring", "transfer"] },
  { id: "ai", labelKey: "settings.group.ai", descriptionKey: "settings.simple.page.ai.description", icon: Sparkles, sections: ["engines", "decisionModel"],
    keywords: ["effort", "new bots", "decision", "keep warm", "engines", "model"] },
  { id: "skills", labelKey: "settings.section.experimental", descriptionKey: "settings.simple.page.skills.description", icon: BookOpen, sections: ["skills", "experimental", "sms"],
    keywords: ["skills", "experimental", "early", "preview", "learn", "sms", "text", "texts", "twilio", "phone", "messaging"] },
  { id: "keys", labelKey: "settings.section.connections", descriptionKey: "settings.simple.page.keys.description", icon: KeyRound, sections: ["connections"],
    keywords: ["keys", "api", "api key", "api keys", "connectors", "composio", "provider keys"] },
  { id: "computer", labelKey: "settings.simple.page.computer", descriptionKey: "settings.simple.page.computer.description", icon: Monitor, sections: ["desktopWorkspaces", "computer", "logins", "workspaces"] },
  { id: "updates", labelKey: "settings.simple.page.updates", descriptionKey: "settings.simple.page.updates.description", icon: CloudDownload, sections: ["updates"],
    keywords: ["update", "version", "release", "product updates", "newsletter", "email updates", "welcome", "tour", "diagnostics", "logs", "support"] },
];

export const SIMPLE_HIDDEN_SECTIONS: readonly AppSettingsSection[] = [];

export const SIMPLE_FOLDED: Partial<Record<AppSettingsSection, SimpleDisclosureId>> = {
  remote: "computer-elsewhere",
  desktopWorkspaces: "computer-elsewhere",
};


export function simpleSettingsPages(available: ReadonlySet<AppSettingsSection>): SimpleSettingsPage[] {
  return SIMPLE_PAGES
    .map((page) => ({ ...page, sections: page.sections.filter((id) => available.has(id)) }))
    .filter((page) => page.sections.length > 0);
}

export function revealSettingsBlock(
  scroller: { scrollTop: number; querySelector: (selector: string) => { scrollIntoView?: (options: ScrollIntoViewOptions) => void } | null },
  section: AppSettingsSection,
  indexInPage: number,
): void {
  if (indexInPage <= 0) { scroller.scrollTop = 0; return; }
  scroller.querySelector(`[data-settings-block="${section}"]`)?.scrollIntoView?.({ block: "start" });
}

function simplePageMatches(page: SimpleSettingsPage, query: string): boolean {
  if (!query) return true;
  if ([t(page.labelKey), ...(page.descriptionKey ? [t(page.descriptionKey)] : []), ...page.keywords ?? []].some((part) => part.toLowerCase().includes(query))) return true;
  return page.sections.some((id) => {
    const entry = SECTIONS.find((candidate) => candidate.id === id);
    return entry ? sectionMatches(entry, query) : false;
  });
}

export function sectionMatches(section: (typeof SECTIONS)[number], query: string): boolean {
  if (!query) return true;
  return [t(section.labelKey), ...section.keywords].some((part) => part.toLowerCase().includes(query));
}

export function SettingsModal() {
  const { state, dispatch } = useStore();
  const remoteActive = window.ogb?.remoteClient?.active === true;
  const requested = state.appSettingsSection;
  const section: AppSettingsSection =
    (remoteActive && !["appearance", "desktopWorkspaces"].includes(requested)) || requested === "remote"
      ? "appearance"
      : requested;
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => window.ogb?.environments?.onOpenSettings?.(() => setQuery("")), []);
  useEffect(() => window.ogb?.onOpenAppSettings?.(() => setQuery("")), []);
  const q = query.trim().toLowerCase();
  const baseSections = SECTIONS.filter((entry) => !remoteActive || entry.id === "appearance" || entry.id === "desktopWorkspaces")
    .filter((entry) => entry.id !== "desktopWorkspaces" || Boolean(window.ogb?.environments))
    .filter((entry) => entry.id !== "workspaces" || workspacesAvailable(state.config))
    .filter((entry) => entry.id !== "people" || (!window.ogb && state.config?.cloudHome !== true))
  const availableSections = baseSections.filter((entry) => entry.id !== "skills" || skillsLibraryEnabled(state.config));
  const visibleSections = availableSections.filter((entry) => sectionMatches(entry, q));

  const simpleAvailable = new Set<AppSettingsSection>([...availableSections.map((entry) => entry.id), ...(remoteActive ? [] : ["updates" as const])]);
  const simplePages = simpleSettingsPages(simpleAvailable);
  const visiblePages = simplePages.filter((page) => simplePageMatches(page, q));
  const currentPage = simplePages.find((page) => page.sections.includes(section));

  const nextVisibleSection = currentPage && visiblePages.includes(currentPage)
    ? undefined
    : visiblePages[0] && (visiblePages[0].sections.find((id) => visibleSections.some((entry) => entry.id === id)) ?? visiblePages[0].sections[0]);

  useEffect(() => {
    if (nextVisibleSection) dispatch({ type: "toggleAppSettings", open: true, section: nextVisibleSection });
  }, [dispatch, nextVisibleSection]);

  const [folds, setFolds] = useState<Partial<Record<SimpleDisclosureId, boolean>>>({});
  const disclose: Disclose = (id) => {
    const open = q !== "" || (folds[id] ?? SIMPLE_FOLDED[requested] === id);
    return { id, open, onToggle: () => setFolds((current) => ({ ...current, [id]: !open })) };
  };
  const [reveal, setReveal] = useState<string | null>(null);

  const sectionIndex = currentPage?.sections.indexOf(section) ?? 0;
  const revealBlock = requested === "remote" ? "remote" : section;
  useEffect(() => {
    if (scrollRef.current) revealSettingsBlock(scrollRef.current, revealBlock as AppSettingsSection, revealBlock === section ? sectionIndex : 1);
  }, [revealBlock, section, sectionIndex]);
  useEffect(() => {
    if (!reveal) return;
    scrollRef.current?.querySelector(`[data-settings-block="${reveal}"]`)?.scrollIntoView?.({ block: "start" });
    setReveal(null);
  }, [reveal]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const search = dialog?.querySelector<HTMLInputElement>("[data-settings-search]");
    dialog?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (dialog && document.activeElement === dialog && event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey
        && search?.checkVisibility()) {
        event.preventDefault();
        search.focus();
        setQuery((current) => current + event.key);
        return;
      }
      // A child editor owns Escape and its focus trap, including while saving.
      if (event.defaultPrevented || (dialog && [...dialog.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')]
        .some(child => child.getClientRects().length))) return;
      if (event.key === "Escape") {
        event.preventDefault();
        dispatch({ type: "toggleAppSettings", open: false });
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.checkVisibility());
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [dispatch]);

  const openSection = (id: AppSettingsSection) => dispatch({ type: "toggleAppSettings", open: true, section: id });



  const renderSection = (id: AppSettingsSection) => {
    switch (id) {
      case "desktopWorkspaces":
        return <ConnectedWorkspacesSettings />;
      case "sms":
        return <SmsSettings />;
      case "connections":
        return (
          <SettingsCard title={t("settings.connections.title")} subtitle={t("settings.connections.subtitle")}>
            <div className="flex flex-col gap-4">
              {state.config?.composio.mode === "managed" ? (
                <Notice tone="ready">{t("settings.connections.ready")}</Notice>
              ) : null}
              <div className="text-[12px] font-medium uppercase tracking-wide text-ink-secondary">{t("keys.providers.title")}</div>
              <p className="-mt-3 text-[12px] leading-relaxed text-ink-secondary">{t("keys.providers.subtitle")}</p>
              <ApiKeyRow section="openai" testProvider="openai" />
              <ApiKeyRow section="anthropic" testProvider="anthropic" />
              <AnthropicEveryClaudeBot />
              <ApiKeyRow section="xai" testProvider="xai" />
              <ApiKeyRow section="openrouter" testProvider="openrouter" />
              <ApiKeyRow section="mistral" testProvider="mistral" />
              <ApiKeyRow section="cerebras" testProvider="cerebras" />
              <ApiKeyRow section="groq" testProvider="groq" />
              <ApiKeyRow section="meta" testProvider="meta" />
              <ApiKeyRow section="deepseek" />
              <LmStudioServer />
              <OtherOpenAiCompatServers />
              <div className="pt-2 text-[12px] font-medium uppercase tracking-wide text-ink-secondary">{t("keys.integrations.title")}</div>
              <ApiKeyRow section="treg" testProvider="treg" /><ApiKeyRow section="box" />
              <VpsConnection />
              <ApiKeyRow section="opencodeGo" />
              {state.config?.cloudHome !== true && (
                <p className="-mt-2 text-[12px] leading-relaxed text-ink-secondary">
                  {t("keys.opencode.providersHint").split("{command}").flatMap((part, index) =>
                    index === 0 ? [part] : [<code key={index} className="font-mono">opencode auth login</code>, part])}
                </p>
              )}
              <OpenCodeProviderKeys />
              <details className="rounded-lg border border-hairline/40 bg-inset px-3 py-2">
                <summary className="cursor-pointer text-[13px] text-ink-secondary flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden"><Chevron kind="disclosure" size="row" />{t("settings.connections.selfHost")}</summary>
                <div className="mt-3">
                  <ApiKeyRow section="composio" />
                </div>
              </details>
            </div>
          </SettingsCard>
        );
      default:
        return null;
    }
  };

  const renderSimplePage = (page: SimpleSettingsPage) => {
    const has = (id: AppSettingsSection) => page.sections.includes(id);
    switch (page.id) {
      case "account": return <SimpleAccountPage has={has} />;
      case "appearance": return <SimpleAppearancePage has={has} />;
      case "import": return <SimpleImportPage has={has} />;
      case "ai": return <SimpleAiPage has={has} disclose={disclose} />;
      case "skills": return <SimpleSkillsPage has={has} sms={renderSection("sms")} />;
      case "keys": return <SimpleKeysPage has={has} connections={renderSection("connections")} />;
      case "computer": return <SimpleComputerPage has={has} servers={renderSection("desktopWorkspaces")} installs={workspacesAvailable(state.config) ? <WorkspacesSection /> : undefined} disclose={disclose} />;
      case "updates": return <SimpleUpdatesPage remoteActive={remoteActive} />;
      default:
        return page.sections.map((id) => <section key={id} data-settings-block={id} className="flex scroll-mt-4 flex-col gap-4">{renderSection(id)}</section>);
    }
  };

  const close = () => dispatch({ type: "toggleAppSettings", open: false });
  const goTo = (id: AppSettingsSection) => { openSection(id); };
  return (
    <div
      className="glass-popup-frame"
      data-settings-sheet
      data-settings-look="simple"
      style={glassPopupFrameStyle()}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div aria-hidden="true" className="glass-scrim pointer-events-none absolute inset-0" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
        tabIndex={-1}
        style={{ outline: "none" }}
        className="glass-surface glass-popup relative flex overflow-hidden rounded-2xl text-ink"
      >
        <span id="app-settings-title" className="sr-only">{t("settings.title")}</span>
        <nav aria-label={t("settings.title")} className="glass-rail hidden min-h-0 w-[198px] shrink-0 flex-col gap-0.5 overflow-y-auto px-3 py-4 sm:flex">
          {visiblePages.length === 0 && (
            <div className="px-[9px] py-3 text-[13px] leading-[18px] text-ink-secondary">{t("settings.noMatch", { query: query.trim() })}</div>
          )}
          {visiblePages.map((page) => {
            const Icon = page.icon;
            const current = page === currentPage;
            return (
              <button
                key={page.id}
                type="button"
                data-settings-page={page.id}
                onClick={() => goTo(page.sections[0]!)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-8 shrink-0 cursor-pointer items-center gap-[9px] rounded-lg px-[9px] text-left text-[13px] text-ink transition-colors motion-reduce:transition-none",
                  current ? "bg-ink/[0.08]" : "hover:bg-ink/[0.06]",
                )}
              >
                <Icon size={15} aria-hidden="true" className="shrink-0" />
                <span className="truncate">{t(page.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-3 py-3 pl-4 pr-14 sm:pb-1.5 sm:pl-12 sm:pt-8">
            <Select className="min-w-0 sm:hidden"
              aria-label={t("settings.title")}
              value={currentPage?.id ?? ""}
              onChange={(event) => {
                setQuery("");
                const page = simplePages.find((candidate) => candidate.id === event.target.value);
                if (page) goTo(page.sections[0]!);
              }}
            >
              {simplePages.map((page) => (
                <option key={page.id} value={page.id}>{t(page.labelKey)}</option>
              ))}
            </Select>
            <div className="hidden min-w-0 sm:block">
              <h2 className="truncate text-[17px] font-medium leading-6 tracking-[-0.008em] text-ink">
                {currentPage ? t(currentPage.labelKey) : null}
              </h2>
              {currentPage?.descriptionKey && (
                <p className="mt-0.5 max-w-[64ch] text-[13px] leading-5 text-ink-secondary">{t(currentPage.descriptionKey)}</p>
              )}
            </div>
          </header>
          <button
            type="button"
            onClick={close}
            aria-label={t("settings.close")}
            title={`${t("settings.close")} (${shortcutLabel("close-panel")})`}
            className="absolute right-3 top-3 flex size-8 cursor-pointer items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-ink/[0.06] hover:text-ink motion-reduce:transition-none"
          >
            <X size={16} aria-hidden="true" />
          </button>

          <div
            ref={scrollRef}
            data-settings-scroll
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-4 pb-8 pt-4 sm:px-8 sm:pb-7 sm:pt-4",
              "[&_[data-ui=button]]:h-8 [&_[data-ui=button]]:rounded-full [&_[data-ui=button]]:border-0 [&_[data-ui=button]]:px-3 [&_[data-ui=button]]:text-[14px] [&_[data-ui=button]]:font-normal",
              "[&_[data-ui=button]:not([data-variant=primary])]:bg-ink/5 [&_[data-ui=button]:not([data-variant=primary])]:text-ink [&_[data-ui=button]:not([data-variant=primary]):enabled:hover]:bg-ink/10",
              "[&_[data-ui=button][data-variant=primary]]:bg-ink [&_[data-ui=button][data-variant=primary]]:text-app [&_[data-ui=button][data-variant=primary]:enabled:hover]:bg-ink/85",
              "[&_.uppercase]:normal-case [&_.uppercase]:tracking-normal",
            )}
          >
            <LicenseExpiryBanner config={state.config} />
            {currentPage ? renderSimplePage(currentPage) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
