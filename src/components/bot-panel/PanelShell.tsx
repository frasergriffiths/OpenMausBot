import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Crown, Pencil, X } from "lucide-react";

import { cn } from "@/lib/cn";
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
import { PANEL_TABS, PAGES, TAB_LABEL, type PanelTarget, type PanelTab, type SimplePageId } from "./page-registry";
import { PageBody, pageSurfaceCls } from "./pages";
import { linkTarget, usePanelLink, type PanelLink } from "./panel-link";
import { roundButtonCls } from "./rows";

/** The top-level tab is remembered per device: switching bots remounts the panel, but should land on the same tab's
 * root. A new named open still wins. */
let lastPanelTab: PanelTab = "profile";
let lastLinkNonce: number | null = null;
let lastBotId: string | null = null;

/** Test seam: the tab is device memory in the app; tests start each case as a fresh device. */
export function resetPanelTabMemory(): void {
  lastPanelTab = "profile";
  lastLinkNonce = null;
  lastBotId = null;
}

function initialTarget(section: BotSettingsSection | null, link: PanelLink | null, botId: string): PanelTarget {
  const freshLink = link && link.section === section && link.nonce !== lastLinkNonce;
  const switching = lastBotId !== null && lastBotId !== botId;
  return freshLink ? linkTarget(section, link) : !switching && section ? linkTarget(section, link) : { tab: lastPanelTab };
}

export function BotPanel({ bot, derived, linkedSection, onClose, onOpenVmWorkspace, headerClassName, headerProps }: {
  bot: Bot;
  derived: ReturnType<typeof useBotSettingsDerived>;
  headerClassName?: string;
  headerProps?: React.HTMLAttributes<HTMLDivElement>;
  linkedSection: BotSettingsSection | null;
  onClose: () => void;
  onOpenVmWorkspace?: (botId: string) => void;
}) {
  const link = usePanelLink();
  const start = useRef(initialTarget(linkedSection, link, bot.id)).current;
  const [tab, setTab] = useState(start.tab);
  const [stack, setStack] = useState<SimplePageId[]>(start.page ? [start.page] : []);
  const [anchor, setAnchor] = useState<string | null>(start.anchor ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInstructions, setEditingInstructions] = useState(Boolean(start.editInstructions));
  const bodyRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const page = stack.at(-1) ?? null;

  const scrollTop = () => bodyRef.current?.scrollTo({ top: 0 });
  const go = (target: PanelTarget) => {
    lastPanelTab = target.tab;
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

  const seen = useRef({ section: linkedSection, link });
  useEffect(() => {
    const changed = seen.current.section !== linkedSection || seen.current.link !== link;
    seen.current = { section: linkedSection, link };
    if (changed && linkedSection) go(linkTarget(linkedSection, link));
  }, [linkedSection, link]);
  useEffect(() => {
    lastPanelTab = tab;
    lastBotId = bot.id;
    if (link) lastLinkNonce = link.nonce;
  }, [bot.id, link, tab]);

  useEffect(() => {
    if (!anchor) return;
    bodyRef.current?.querySelector(`[data-panel-card="${anchor}"]`)?.scrollIntoView({ block: "start" });
    setAnchor(null);
  }, [anchor, page, tab]);

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

  const backLabel = stack.length > 1 ? t(PAGES[stack[stack.length - 2]!].title, { name: bot.name }) : t(TAB_LABEL[tab]);

  return (
    <div data-bot-panel="" className="@container flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      {page === null ? (
        <>
          <div ref={editorRef} className="relative">
            <div data-panel-header="" className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-hairline/40 px-3", headerClassName)} {...headerProps}>
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
                <div className="fixed inset-0 z-20" aria-hidden="true" data-panel-scrim onClick={() => setEditorOpen(false)} />
                <AvatarEditorCard bot={bot} activeState={derived.activeState} onPatch={derived.patch} onClose={() => setEditorOpen(false)} />
              </>
            )}
          </div>
          <div className="relative z-10 flex shrink-0 items-center bg-panel px-3 pb-1 pt-2">
            <Select
              className="w-full"
              size="sm"
              value={tab}
              aria-label={t("botSettings.simple.tabs")}
              onChange={(event) => openTab(event.target.value as PanelTarget["tab"])}
            >
              {PANEL_TABS.map((id) => <option key={id} value={id}>{t(TAB_LABEL[id])}</option>)}
            </Select>
          </div>
        </>
      ) : (
        <div data-panel-header="" className={cn("flex h-14 shrink-0 items-center gap-2 border-b border-hairline/40 px-3", headerClassName)} {...headerProps}>
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
            : page === "browser" || page === "files"
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
          <div data-panel-page-view={page} className={cn((page === "browser" || page === "files" || page === "computer") && "flex min-h-0 flex-1 flex-col")}>
            <span id="bot-settings-title" className="sr-only">{bot.name}</span>
            <div className={cn(pageSurfaceCls, (page === "browser" || page === "files" || page === "computer") && "min-h-0 flex-1")}>
              <PageBody
                page={page}
                bot={bot}
                derived={derived}
                onOpen={openPage}
                editingInstructions={editingInstructions}
                onEditInstructions={setEditingInstructions}
                onOpenVmWorkspace={onOpenVmWorkspace}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
