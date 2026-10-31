import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, BookOpen, Box, Brain, Loader2, Monitor, Plus, Save, Users, X } from "lucide-react";

import { api, formatTime, openBot, openThread, useStore, type Bot } from "@/state/store";
import {
  EMPTY_TEAM_MAP_SNAPSHOT,
  buildTeamMapEdges,
  buildTeamMapSections,
  moveBotRequest,
  teamMapBotCount,
  type TeamMapEdge,
  type TeamMapSnapshot,
} from "@/lib/team-map";
import { cn } from "@/lib/cn";
import { useShowThreads } from "@/lib/thread-preferences";
import { useCaptionChrome } from "@/components/DesktopCapabilities";
import { placeOffered } from "@/lib/place";
import { Button, buttonStyles, Switch } from "@/components/ui";
import { TeamBoard } from "./TeamBoard";
import { MapModeToggle, TeamOrgChart, useMapMode } from "./TeamOrgChart";
import { useTeamPeople } from "@/state/team-people";
import { TeamDialog } from "./TeamDialog";
import { TeamMemoryDialog } from "./TeamMemoryDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { t } from "@/lib/i18n";
import { CanvasComputers } from "./CanvasComputers";
import { useMapComputers, useShowComputers } from "@/lib/map-computers";
import { MapComposer } from "./MapComposer";
import { openBotSettings } from "./bot-panel/panel-link";
import type { TeamComputer } from "../../shared/team-computer";
import { Chevron } from "./chevron";
import { MENU_LABEL, MENU_ROW } from "./menu-recipe";
import { SIMPLE_MENU } from "./SidebarSimpleTop";

export function EdgeRow({ edge, bots }: { edge: TeamMapEdge; bots: Bot[] }) {
  const { state, dispatch } = useStore();
  const showThreads = useShowThreads();
  const source = bots.find((bot) => bot.id === edge.sourceBotId);
  const target = bots.find((bot) => bot.id === edge.targetBotId);
  if (!source || !target) return null;
  const live = edge.state !== "connected";
  return (
    <button
      onClick={() => {
        if (!edge.groupId && edge.threadId) openThread(dispatch, { botId: target.id, threadId: edge.threadId }, state, showThreads);
        else if (edge.groupId) dispatch({ type: "select", id: edge.groupId });
        else openBot(dispatch, target, showThreads);
      }}
      className="flex w-full items-center gap-3 rounded-xl border border-hairline/40 bg-card px-3 py-2.5 text-left transition hover:bg-raised/50"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-[13px] font-medium text-ink">{source.name}</span>
        <ArrowRight size={13} className={cn("shrink-0", live ? "text-accent" : "text-ink-secondary")} />
        <span className="truncate text-[13px] font-medium text-ink">{target.name}</span>
      </div>
      {edge.reason && <span className="max-w-[220px] truncate text-[12px] text-ink-secondary">{edge.reason}</span>}
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-medium",
          edge.state === "running"
            ? "bg-success/15 text-success"
            : edge.state === "queued"
              ? "bg-warning/15 text-warning"
              : "bg-control text-ink-secondary",
        )}
      >
      {edge.state === "running" ? t("canvas.edge.running") : edge.state === "queued" ? t("canvas.edge.queued") : edge.lastAt ? formatTime(edge.lastAt) : t("canvas.edge.connected")}
      </span>
    </button>
  );
}

interface SectionContextResponse {
  section: string;
  label: string;
  text: string;
  updatedAt: number | null;
  maxBytes: number;
}

function SectionContextDialog({ section, label, onClose }: { section: string; label: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onCloseRef = useRef(onClose);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [maxBytes, setMaxBytes] = useState(24_000);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = text !== savedText;
  const bytes = useMemo(() => new TextEncoder().encode(text).byteLength, [text]);
  onCloseRef.current = onClose;
  savingRef.current = saving;
  dirtyRef.current = dirty;

  const requestClose = useCallback(() => {
    if (savingRef.current) return;
    if (dirtyRef.current && !window.confirm(t("team.instructionsDiscard"))) return;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [requestClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api(`/api/section-context?section=${encodeURIComponent(section)}`)
      .then((result: SectionContextResponse) => {
        if (cancelled) return;
        setText(result.text);
        setSavedText(result.text);
        setUpdatedAt(result.updatedAt);
        setMaxBytes(result.maxBytes);
        window.setTimeout(() => textareaRef.current?.focus(), 0);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  const save = async () => {
    if (bytes > maxBytes) return;
    setSaving(true);
    setError(null);
    try {
      const result: SectionContextResponse = await api(
        `/api/section-context?section=${encodeURIComponent(section)}`,
        { method: "PUT", body: JSON.stringify({ text }) },
      );
      setSavedText(result.text);
      setText(result.text);
      setUpdatedAt(result.updatedAt);
      setMaxBytes(result.maxBytes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && requestClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-context-title"
        tabIndex={-1}
        className="flex max-h-[min(680px,calc(100dvh-2rem))] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border border-hairline/50 bg-panel shadow-2xl shadow-black/50 outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-hairline/40 px-6 pb-4 pt-6 sm:px-8 sm:pt-7">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen size={19} className="text-accent" />
              <h2 id="section-context-title" className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
                {t("team.instructionsTitle", { name: label })}
              </h2>
            </div>
            <p className="mt-1.5 max-w-[520px] text-[13px] leading-relaxed text-ink-secondary">
              {t("team.instructionsHint")}
            </p>
          </div>
          <button
            onClick={requestClose}
            disabled={saving}
            aria-label={t("team.instructionsClose")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-raised hover:text-ink disabled:opacity-40"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center text-ink-secondary">
              <Loader2 size={20} className="animate-spin" aria-label={t("team.instructionsLoading")} />
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t("team.instructionsPlaceholder")}
                aria-label={t("team.instructionsTitle", { name: label })}
                className="min-h-[280px] w-full resize-y rounded-xl border border-hairline/60 bg-inset px-4 py-3 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-tertiary focus:border-accent/50"
              />
              <div className="mt-2 flex items-start justify-between gap-4 text-[12px] text-ink-secondary">
                <span>
                  {t("team.instructionsFactHint")} {updatedAt ? ` ${t("team.instructionsLastSaved", { time: new Date(updatedAt).toLocaleString() })}` : ""}
                </span>
                <span className={cn("shrink-0 tabular-nums", bytes > maxBytes && "text-danger")}>
                  {bytes.toLocaleString()} / {maxBytes.toLocaleString()} bytes
                </span>
              </div>
            </>
          )}
          {error && <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div>}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-hairline/40 px-6 py-4 sm:px-8">
          <button onClick={requestClose} disabled={saving} className="rounded-lg px-3.5 py-2 text-[13px] text-ink-secondary hover:bg-raised hover:text-ink disabled:opacity-40">
            {t("common.cancel")}
          </button>
          <button
            onClick={() => void save()}
            disabled={loading || saving || !dirty || bytes > maxBytes}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white hover:brightness-110 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t("team.instructionsSave")}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** How long a card acknowledges a message sent from the map; its border fades within this. */
const SENT_HIGHLIGHT_MS = 1_400;
const menuRow = cn(MENU_ROW, "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus");

function moveMenuFocus(event: ReactKeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
  if (!items.length) return;
  event.preventDefault();
  const index = items.indexOf(document.activeElement as HTMLElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
    : event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
  items[next].focus();
}

export function TeamMapPage() {
  const { state, dispatch } = useStore();
  const { dragProps } = useCaptionChrome();
  const remoteClient = window.ogb?.remoteClient?.active === true;
  const teamPeople = useTeamPeople();
  const reportsChart = useMapMode() === "people" && teamPeople !== null;
  const [snapshot, setSnapshot] = useState<TeamMapSnapshot>(EMPTY_TEAM_MAP_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [contextEditor, setContextEditor] = useState<{ section: string; label: string } | null>(null);
  const [memoryEditor, setMemoryEditor] = useState<{ section: string; label: string; fromHeader: boolean } | null>(null);
  const memoryTrigger = useRef<HTMLElement | null>(null);
  const memoryMenu = useRef<HTMLDetailsElement>(null);
  const [teamEditor, setTeamEditor] = useState<{ section?: string; rename?: boolean } | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null);
  const [computersOpen, setComputersOpen] = useState(false);
  const [createComputerRequest, setCreateComputerRequest] = useState(0);
  const [computers, setComputers] = useState<TeamComputer[]>([]);
  const [computerDrop, setComputerDrop] = useState<{ id: string; section: string } | null>(null);
  const clearComputerDrop = useCallback(() => setComputerDrop(null), []);
  const [pendingMove, setPendingMove] = useState<{ bot: Bot; destination: string; resolve: (moved: boolean) => void } | null>(null);
  const pendingMoveRef = useRef(pendingMove);
  pendingMoveRef.current = pendingMove;
  useEffect(() => () => pendingMoveRef.current?.resolve(false), []);
  const bots = useMemo(() => state.bots.filter((bot) => !bot.hidden), [state.bots]);
  const sections = useMemo(() => {
    const names = [...new Set([...(state.sections ?? []), ...state.groups.flatMap((group) => group.section ? [group.section] : [])])];
    const order = (key: string) => key === "" ? names.length : names.includes(key) ? names.indexOf(key) : names.length;
    const namedGeneral = names.some((name) => name.trim() === "General");
    return buildTeamMapSections(bots, names).sort((a, b) => order(a.key) - order(b.key))
      .map((section) => section.key === "" && namedGeneral ? { ...section, name: t("canvas.generalUngrouped") } : section);
  }, [bots, state.sections, state.groups]);
  const edges = useMemo(() => buildTeamMapEdges(bots, snapshot), [bots, snapshot]);
  const anyComputer = bots.some((bot) => bot.computer === "cloud" && bot.cloudBackend !== "vps") || computers.some((computer) => computer.section !== null);
  const { show: showComputers, loaded: computersChoiceLoaded, choose: setShowComputers } = useShowComputers(anyComputer);
  const mapComputers = useMapComputers(!remoteClient && computersChoiceLoaded && showComputers);
  const [taggedBotIds, setTaggedBotIds] = useState<string[]>([]);
  const [sent, setSent] = useState<{ botIds: string[]; key: number } | null>(null);
  const sentTimer = useRef<number | undefined>(undefined);
  const acknowledgeSent = useCallback((botIds: string[]) => {
    window.clearTimeout(sentTimer.current);
    setSent((previous) => ({ botIds, key: (previous?.key ?? 0) + 1 }));
    sentTimer.current = window.setTimeout(() => setSent(null), SENT_HIGHLIGHT_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(sentTimer.current), []);
  const composerTeams = useMemo(() => sections.map((section) => ({ key: section.key, name: section.name, count: section.chiefs.length + section.members.length })), [sections]);

  // The 3-second poll never wakes a Cloud home that went to sleep.
  const refresh = useCallback(async (background = false) => {
    try {
      setSnapshot(await api("/api/team-map", background ? { background } : undefined));
      setRefreshError(null);
    } catch (requestError) {
      setRefreshError(requestError instanceof Error ? requestError.message : String(requestError));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 3_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const moveBot = async (bot: Bot, destination: string) => {
    setError(null);
    try {
      const request = moveBotRequest(bot.id, destination, sections.map((section) => section.key));
      const result: { sections: string[]; bots: Bot[] } = await api(request.path, {
        method: request.method, body: JSON.stringify(request.body),
      });
      dispatch({ type: "sections", sections: result.sections });
      for (const patched of result.bots) dispatch({ type: "botPatched", bot: patched });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      throw cause;
    }
  };

  const requestMove = (bot: Bot, destination: string) => new Promise<boolean>((resolve) => {
    pendingMoveRef.current?.resolve(false);
    setPendingMove({ bot, destination, resolve });
  });
  const cancelMove = useCallback(() => {
    pendingMoveRef.current?.resolve(false);
    setPendingMove(null);
  }, []);
  const closeMemoryMenu = (restoreFocus = false) => {
    memoryMenu.current?.removeAttribute("open");
    if (restoreFocus) memoryTrigger.current?.focus({ preventScroll: true });
  };
  const openMemory = (section: string, label: string, fromHeader: boolean) => {
    setMemoryEditor({ section, label, fromHeader });
  };
  const closeMemory = () => {
    const fromHeader = memoryEditor?.fromHeader === true;
    const section = memoryEditor?.section;
    setMemoryEditor(null);
    requestAnimationFrame(() => {
      if (fromHeader) { memoryTrigger.current?.focus({ preventScroll: true }); return; }
      const panel = [...document.querySelectorAll<HTMLElement>("[data-team-key]")].find((element) => element.dataset.teamKey === section);
      panel?.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    });
  };

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-app text-ink"
      onPointerDownCapture={(event) => {
        const target = event.target as Node;
        if (target instanceof Element && target.closest("[data-team-menu]")) return;
        for (const details of document.querySelectorAll<HTMLDetailsElement>("details[open]")) {
          if (!details.contains(target)) details.removeAttribute("open");
        }
      }}>
      <header {...dragProps} className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-hairline/40 px-6 py-4 max-md:pl-12">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[17px] font-semibold">{t("canvas.title")}</h1>
            <span className="ml-1 rounded-full bg-control px-2 py-0.5 text-[12px] text-ink-secondary">{teamMapBotCount(bots.length)}</span>
          </div>
          <p className="mt-1 text-[12px] text-ink-secondary">{t("canvas.description")}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {teamPeople && <MapModeToggle />}
          {!remoteClient && <>
            {sections.length === 1 ? (
              <Button size="sm" type="button" ref={(node) => { memoryTrigger.current = node; }}
                onClick={() => openMemory(sections[0].key, sections[0].name, true)}>
                <Brain size={16} className="text-ink-secondary" />{t("canvas.departmentMemory")}
              </Button>
            ) : sections.length > 1 ? (
              <details ref={memoryMenu} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMemoryMenu(); }}
                onToggle={(event) => {
                  if (!event.currentTarget.open) return;
                  requestAnimationFrame(() => event.currentTarget.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true }));
                }}
                onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeMemoryMenu(true); } }}>
                <summary ref={(node) => { memoryTrigger.current = node; }} aria-haspopup="menu"
                  className={buttonStyles({ size: "sm", className: "cursor-pointer list-none [&::-webkit-details-marker]:hidden" })}>
                  <Brain size={16} className="text-ink-secondary" />{t("canvas.departmentMemory")}
                </summary>
                <div role="menu" aria-label={t("canvas.departmentMemory")} className={cn("absolute right-0 top-full z-40 mt-2 min-w-[220px]", SIMPLE_MENU)}
                  onKeyDown={moveMenuFocus}>
                  <div className={MENU_LABEL}>{t("canvas.departmentMemory")}</div>
                  {sections.map((section) => <button key={section.key || "general"} type="button" role="menuitem" className={menuRow}
                    onClick={() => { closeMemoryMenu(); openMemory(section.key, section.name, true); }}>{section.name}</button>)}
                </div>
              </details>
            ) : null}
            <label className={buttonStyles({ size: "sm", className: "h-8 cursor-pointer select-none" })} title={t("canvas.showComputersHint")}>
              <Switch checked={showComputers} onClick={() => setShowComputers(!showComputers)} aria-label={t("canvas.showComputers")} />
              <span>{t("canvas.showComputers")}</span>
            </label>
            <Button size="sm" type="button" aria-expanded={computersOpen} onClick={() => setComputersOpen((value) => !value)}>
              <Monitor size={16} className="text-ink-secondary" />{t("canvas.computers")}
            </Button>
            <details className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.removeAttribute("open"); }}
              onToggle={(event) => {
                if (!event.currentTarget.open) return;
                requestAnimationFrame(() => event.currentTarget.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true }));
              }}
              onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.currentTarget.removeAttribute("open"); event.currentTarget.querySelector("summary")?.focus(); } }}>
              <summary aria-label={t("canvas.addToMap")} className={buttonStyles({ size: "sm", className: "cursor-pointer list-none [&::-webkit-details-marker]:hidden" })}>
                <Plus size={16} className="text-ink-secondary" />{t("common.add")}
              </summary>
              <div role="menu" aria-label={t("canvas.addToMap")} className={cn("absolute right-0 top-full z-40 mt-2 w-[220px]", SIMPLE_MENU)} onKeyDown={moveMenuFocus}>
                <div className={MENU_LABEL}>{t("canvas.departmentGroup")}</div>
                <button type="button" role="menuitem" className={menuRow} onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open"); setTeamEditor({});
                }}><Users size={16} className="text-ink-secondary" />{t("canvas.newDepartment")}</button>
                <div className={MENU_LABEL}>{t("canvas.computers")}</div>
                <button type="button" role="menuitem" className={menuRow} onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open"); setComputersOpen(true); setCreateComputerRequest((value) => value + 1);
                }}><Box size={16} className="text-ink-secondary" />{t("canvas.cloudComputer")}</button>
                {placeOffered("vm", state.config) && <button type="button" role="menuitem" className={menuRow} onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open"); dispatch({ type: "toggleAppSettings", section: "computer", open: true });
                }}><Monitor size={16} className="text-ink-secondary" />{t("canvas.localVm")}</button>}
              </div>
            </details>
          </>}
        </div>
      </header>
      {(error || refreshError) && <div role="alert" className="flex shrink-0 items-center justify-between gap-3 border-b border-danger/20 bg-danger/10 px-6 py-2 text-[12px] text-danger">
        {error || refreshError}
        <button aria-label={t("common.close")} className="rounded p-1 hover:bg-danger/10" onClick={() => { setError(null); setRefreshError(null); }}><X size={14} /></button>
      </div>}
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {reportsChart ? <TeamOrgChart bots={bots} /> : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TeamBoard sections={sections} canManage={!remoteClient} onMove={requestMove} taggedBotIds={taggedBotIds} sent={sent}
                connectedBotIds={state.settingsOpen ? edges.flatMap((edge) => edge.sourceBotId === state.selectedId ? [edge.targetBotId] : edge.targetBotId === state.selectedId ? [edge.sourceBotId] : []) : []}
                onComputer={(bot) => openBotSettings(dispatch, "access", { botId: bot.id })}
                computers={showComputers && computersChoiceLoaded && !remoteClient ? mapComputers.computers : undefined} computerFrames={mapComputers.frames}
                teamComputers={Object.fromEntries(computers.filter((computer) => computer.section !== null).map((computer) => [computer.section!, { name: computer.name, state: computer.state }]))}
                onTeamComputer={() => setComputersOpen(true)}
                onComputerDrop={(id, section) => { if (!remoteClient) { setComputersOpen(true); setComputerDrop({ id, section }); } }}
                onInstructions={(section, label) => setContextEditor({ section, label })}
                onEditTeam={(section, rename) => setTeamEditor({ section, rename })}
                onDeleteTeam={setDeletingTeam}
                onMemory={(section, label) => openMemory(section, label, false)} />
              {edges.length > 0 && <details className="mx-auto w-full max-w-[1400px] border-t border-hairline/40 px-5 pb-4 pt-3 md:px-6">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12px] text-ink-secondary [&::-webkit-details-marker]:hidden"><Chevron kind="disclosure" size="row" />{t("canvas.handoffs")} · {edges.length}</summary>
                <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{edges.slice(0, 12).map((edge) => <EdgeRow key={edge.sourceBotId + ":" + edge.targetBotId} edge={edge} bots={bots} />)}</div>
              </details>}
            </div>
          )}
          {bots.length > 0 && <MapComposer bots={bots} teams={composerTeams} onTagged={setTaggedBotIds} onSent={acknowledgeSent} />}
        </div>
        {!remoteClient && <CanvasComputers open={computersOpen} createRequest={createComputerRequest} drop={computerDrop} sections={sections}
          onClose={() => setComputersOpen(false)} onDropHandled={clearComputerDrop} onChange={setComputers} />}
      </div>
      {contextEditor && (
        <SectionContextDialog
          section={contextEditor.section}
          label={contextEditor.label}
          onClose={() => setContextEditor(null)}
        />
      )}
      {teamEditor && <TeamDialog {...teamEditor} onClose={() => setTeamEditor(null)} />}
      {memoryEditor && <TeamMemoryDialog key={memoryEditor.section} section={memoryEditor.section} label={memoryEditor.label} onClose={closeMemory} />}
      <ConfirmDialog open={pendingMove !== null} tone="neutral" title={t("canvas.moveConfirmTitle", { name: pendingMove?.bot.name ?? t("canvas.bot"), team: pendingMove?.destination || t("settings.section.general") })}
        body={t("canvas.moveConfirmBody")}
        confirmLabel={t("canvas.moveConfirm") } onCancel={cancelMove} onConfirm={() => {
          const move = pendingMoveRef.current;
          if (!move) return;
          setPendingMove(null);
          void moveBot(move.bot, move.destination).then(() => move.resolve(true), () => move.resolve(false));
        }} />
      <ConfirmDialog open={deletingTeam !== null} title={t("team.deleteTitle", { name: deletingTeam ?? "" })}
        body={t("team.deleteKeepBotsDescription")}
        confirmLabel={t("team.delete")} onCancel={() => setDeletingTeam(null)} onConfirm={() => {
          const name = deletingTeam;
          setDeletingTeam(null);
          if (!name) return;
          void api("/api/sidebar-sections?section=" + encodeURIComponent(name), { method: "DELETE" })
            .then(({ sections: names }) => dispatch({ type: "sections", sections: names }))
            .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
        }} />
    </main>
  );
}
