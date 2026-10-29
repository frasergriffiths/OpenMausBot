import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Crown, Pencil, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { PILL_TAB, PILL_TAB_OFF, PILL_TAB_ON, PILL_TABS } from "@/components/pill-tabs";
import { t } from "@/lib/i18n";
import type { Bot, BotSettingsSection } from "@/state/store";
import { ChatShareMenu } from "@/components/ChatMoreMenu";
import { BotAvatar } from "@/components/Avatar";
import { Select } from "@/components/Select";
import { MAUS_COLORS, mascotInk } from "@/lib/mascot";
import type { useBotSettingsDerived } from "../bot-settings/useBotSettingsDerived";
import { AvatarEditorCard } from "./AvatarEditorCard";
import { ComputerTab } from "./ComputerTab";
import { DetailsTab } from "./DetailsTab";
import { LibraryTab } from "./LibraryTab";
import { PANEL_TABS, PAGES, TAB_LABEL, type PanelTarget, type SimplePageId } from "./page-registry";
import { PageBody, pageSurfaceCls } from "./pages";
import { linkTarget, usePanelLink, type PanelLink } from "./panel-link";
import { roundButtonCls } from "./rows";

function initialTarget(section: BotSettingsSection | null, link: PanelLink | null): PanelTarget {
  return section ? linkTarget(section, link) : { tab: "profile" };
}

export function BotPanel({ bot, derived, linkedSection, onClose }: {
  bot: Bot;
  derived: ReturnType<typeof useBotSettingsDerived>;
  headerClassName?: string;
  linkedSection: BotSettingsSection | null;
  onClose: () => void;
}) {
  const link = usePanelLink();
  const [tab, setTab] = useState(() => initialTarget(linkedSection, link).tab);
  const [stack, setStack] = useState<SimplePageId[]>(() => {
    const page = initialTarget(linkedSection, link).page;
    return page ? [page] : [];
  });
  const [anchor, setAnchor] = useState<string | null>(() => initialTarget(linkedSection, link).anchor ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInstructions, setEditingInstructions] = useState(() => Boolean(initialTarget(linkedSection, link).editInstructions));
  const bodyRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const page = stack.at(-1) ?? null;

  const scrollTop = () => bodyRef.current?.scrollTo({ top: 0 });
  const go = (target: PanelTarget) => {
    setTab(target.tab);
    setStack(target.page ? [target.page] : []);
    setAnchor(target.anchor ?? null);
    setEditorOpen(false);
    setEditingInstructions(Boolean(target.editInstructions));
    scrollTop();
  };
  const openTab = (next: PanelTarget["tab"]) => go({ tab: next });
  const openPage = (next: SimplePageId) => {
    setStack((current) => [...current, next]);
    setEditorOpen(false);
    scrollTop();
  };
  const closeEditor = () => {
    setEditorOpen(false);
    editorRef.current?.querySelector<HTMLElement>("[data-panel-avatar]")?.focus();
  };
  const back = () => {
    setStack((current) => current.slice(0, -1));
    scrollTop();
  };

  useEffect(() => {
    if (linkedSection) go(linkTarget(linkedSection, link));
  }, [linkedSection, link]);

  useEffect(() => {
    if (!anchor) return;
    bodyRef.current?.querySelector(`[data-panel-card="${anchor}"]`)?.scrollIntoView({ block: "start" });
    setAnchor(null);
  }, [anchor, page, tab]);

  useEffect(() => {
    if (page) return;
    const index = PANEL_TABS.indexOf(tab);
    tabRefs.current[index]?.focus({ preventScroll: true });
  }, [page, tab]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const target = event.target as Partial<Element> | null;
    const inDialog = typeof target?.closest === "function" ? target.closest('[role="dialog"], [role="alertdialog"]') : null;
    const ownDialog = inDialog && !inDialog.contains(event.currentTarget) && inDialog !== editorRef.current && !editorRef.current?.contains(inDialog);
    if (ownDialog) return;
    event.preventDefault();
    event.stopPropagation();
    if (editorOpen) closeEditor();
    else if (stack.length > 0) back();
    else onClose();
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = PANEL_TABS.indexOf(tab);
    const next = event.key === "ArrowRight" ? (current + 1) % PANEL_TABS.length
      : event.key === "ArrowLeft" ? (current + PANEL_TABS.length - 1) % PANEL_TABS.length
        : event.key === "Home" ? 0 : PANEL_TABS.length - 1;
    openTab(PANEL_TABS[next]!);
  };

  const backLabel = stack.length > 1 ? t(PAGES[stack[stack.length - 2]!].title, { name: bot.name }) : t(TAB_LABEL[tab]);

  return (
    <div data-bot-panel="" className="@container flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      {page === null ? (
        <>
          <div ref={editorRef} className="relative">
            <div data-panel-header="" className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline/40 px-3">
              <div data-panel-leading="" className="flex w-[34px] shrink-0 justify-center">
                <button
                  type="button"
                  data-panel-avatar
                  aria-label={t("botPanel.avatar.edit", { name: bot.name })}
                  aria-expanded={editorOpen}
                  onClick={() => setEditorOpen((open) => !open)}
                  className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-border"
                >
                  <BotAvatar bot={bot} size={32} state={derived.activeState} />
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white opacity-0 transition-[opacity,background-color] group-hover:bg-black/40 group-hover:opacity-100 group-focus-visible:bg-black/40 group-focus-visible:opacity-100 group-focus-within:bg-black/40 group-focus-within:opacity-100 touch:opacity-100">
                    <Pencil size={14} />
                  </span>
                  {bot.chiefOfStaff && (
                    <span aria-hidden="true" className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full ring-2 ring-app" style={{ backgroundColor: MAUS_COLORS[bot.color], color: mascotInk(bot.color) }}>
                      <Crown size={11} fill="currentColor" />
                    </span>
                  )}
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="bot-settings-title" className="truncate text-[15px] font-semibold leading-5 text-ink" title={bot.name}>{bot.name}</h2>
                {bot.title.trim() && <p className="truncate text-[12px] leading-4 text-ink-secondary" title={bot.title}>{bot.title}</p>}
              </div>
              <ChatShareMenu bot={bot} className={roundButtonCls} />
              <div data-panel-close="" className="flex w-[34px] shrink-0 justify-end">
                <button type="button" onClick={onClose} aria-label={t("botSettings.simple.close")} className={roundButtonCls}>
                  <X size={16} className="pointer-events-none" />
                </button>
              </div>
            </div>
            {editorOpen && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden="true" data-panel-scrim onClick={() => setEditorOpen(false)} />
                <AvatarEditorCard bot={bot} activeState={derived.activeState} onPatch={derived.patch} onClose={() => setEditorOpen(false)} />
              </>
            )}
          </div>
          {/* 8px above the pills and 8px below them: the same step, so the tab row does not look bottom-heavy. */}
          <div className="flex h-[38px] shrink-0 items-center px-3 pt-2">
            <div role="tablist" aria-label={t("botSettings.simple.tabs")} className={cn(PILL_TABS, "hidden w-full @[270px]:flex")} onKeyDown={onTabKeyDown}>
              {PANEL_TABS.map((id, index) => (
                <button
                  key={id}
                  ref={(node) => { tabRefs.current[index] = node; }}
                  type="button"
                  role="tab"
                  id={`bot-panel-tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls="bot-panel-tabpanel"
                  tabIndex={tab === id ? 0 : -1}
                  data-panel-tab={id}
                  onClick={() => openTab(id)}
                  className={cn(PILL_TAB, "flex-auto", tab === id ? PILL_TAB_ON : PILL_TAB_OFF)}
                >
                  {t(TAB_LABEL[id])}
                </button>
              ))}
            </div>
            <div className="@[270px]:hidden w-full">
            <Select
              size="sm"
              value={tab}
              aria-label={t("botSettings.simple.tabs")}
              onChange={(event) => openTab(event.target.value as PanelTarget["tab"])}
            >
              {PANEL_TABS.map((id) => <option key={id} value={id}>{t(TAB_LABEL[id])}</option>)}
            </Select>
            </div>
          </div>
        </>
      ) : (
        <div data-panel-header="" className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline/40 px-3">
          <div data-panel-leading="" className="flex w-[34px] shrink-0 justify-start">
            <button type="button" data-panel-back onClick={back} aria-label={backLabel} className={cn(roundButtonCls, "shrink-0")}>
              <ArrowLeft size={16} className="pointer-events-none" />
            </button>
          </div>
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold leading-6 text-ink">{t(PAGES[page].title, { name: bot.name })}</h2>
          <div data-panel-close="" className="flex w-[34px] shrink-0 justify-end">
            <button type="button" onClick={onClose} aria-label={t("botSettings.simple.close")} className={roundButtonCls}>
              <X size={16} className="pointer-events-none" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={bodyRef}
        data-bot-panel-body
        className={cn(
          "min-h-0 flex-1",
          page === "computer"
            ? "flex flex-col overflow-hidden px-3 pb-3 pt-2"
            : page === "browser" || page === "data" || page === "files"
              ? "flex flex-col overflow-hidden p-3"
            : page === null
              ? "overflow-y-auto px-4 pb-6 pt-2"
              : "overflow-y-auto px-4 pb-6 pt-4",
        )}
      >
        {page === null ? (
          <div
            id="bot-panel-tabpanel"
            role="tabpanel"
            aria-labelledby={`bot-panel-tab-${tab}`}
            data-panel-tabpanel={tab}
          >
            {tab === "profile" && <DetailsTab bot={bot} derived={derived} onOpen={openPage} editingInstructions={editingInstructions} onEditInstructions={setEditingInstructions} />}
            {tab === "library" && <LibraryTab bot={bot} onOpen={openPage} />}
            {tab === "computer" && <ComputerTab bot={bot} derived={derived} onOpen={openPage} />}
          </div>
        ) : (
          <div data-panel-page-view={page} className={cn((page === "browser" || page === "data" || page === "files" || page === "computer") && "flex min-h-0 flex-1 flex-col")}>
            <span id="bot-settings-title" className="sr-only">{bot.name}</span>
            <div className={cn(pageSurfaceCls, (page === "browser" || page === "data" || page === "files" || page === "computer") && "min-h-0 flex-1")}>
              <PageBody
                page={page}
                bot={bot}
                derived={derived}
                onOpen={openPage}
                editingInstructions={editingInstructions}
                onEditInstructions={setEditingInstructions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
