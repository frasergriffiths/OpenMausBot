import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Brain, Crown, MessageCircle, Monitor, MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api, openBot, useStore, type Bot } from "@/state/store";
import { useShowThreads } from "@/lib/thread-preferences";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { teamMapBotCount, teamMapStatus, type TeamMapSection } from "@/lib/team-map";
import { COMPUTER_DRAG_TYPE, orderBots, parseBotOrders, reorderBot } from "@/lib/team-canvas";
import { computerForBot, type ShownFrame } from "@/lib/map-computers";
import type { MapComputer } from "../../shared/map-computer";
import { BotAvatar } from "./Avatar";
import { InstanceProviderMark, ProviderMark } from "./ProviderIcons";
import { openBotSettings } from "./bot-panel/panel-link";
import { MENU_ROW, MENU_SEPARATOR } from "./menu-recipe";
import { SIMPLE_MENU } from "./SidebarSimpleTop";
import { teamMenuPosition, type TeamMenuAnchor } from "./SidebarTeamMenu";

const BOT_DRAG_TYPE = "application/x-omb-bot";
const menuRow = cn(MENU_ROW, "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus");

function BotCard({ bot, selected, moving, connected, tagged = false, sent, hasComputer = false, computer, frame, onComputer, onArrange, onDragStart, onDragEnd }: {
  bot: Bot;
  selected: boolean;
  moving: boolean;
  connected: boolean;
  tagged?: boolean;
  sent?: number;
  hasComputer?: boolean;
  computer?: MapComputer;
  frame?: ShownFrame;
  onComputer?: (bot: Bot) => void;
  onArrange?: (bot: Bot, delta: number) => void;
  onDragStart: (event: DragEvent<HTMLElement>, bot: Bot) => void;
  onDragEnd: () => void;
}) {
  const { state, dispatch } = useStore();
  const showThreads = useShowThreads();
  const status = teamMapStatus(bot);
  const instance = state.instances.find((item) => item.instanceId === bot.modelSelection.instanceId);
  const model = instance?.models.options.find((item) => item.id === bot.modelSelection.model)?.label ?? bot.modelSelection.model;
  return <article data-bot-id={bot.id} draggable onDragStart={(event) => onDragStart(event, bot)} onDragEnd={onDragEnd}
    className={cn("group relative flex min-h-[124px] min-w-0 flex-col rounded-xl border bg-card transition-colors",
      selected ? "border-accent/60 ring-1 ring-accent/15" : connected ? "border-accent/40" : "border-hairline/50 hover:border-ink-secondary/40",
      tagged && "border-accent ring-4 ring-accent/25", moving && "opacity-35")}>
    {sent !== undefined && <span key={sent} data-sent-highlight aria-hidden className="pointer-events-none absolute -inset-px animate-sent-border rounded-xl border-2 border-accent" />}
    <button aria-label={t("canvas.editBot", { name: bot.name })}
      onClick={() => openBotSettings(dispatch, "identity", { botId: bot.id })}
      title={onArrange ? t("canvas.reorderHint") : undefined}
      onKeyDown={(event) => {
        if (!onArrange || !event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
        event.preventDefault(); event.stopPropagation();
        onArrange(bot, event.key === "ArrowUp" ? -1 : 1);
      }}
      className="flex w-full cursor-grab items-center gap-3 rounded-t-xl px-3 py-3 text-left active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-accent">
      <BotAvatar bot={bot} size={36} motion="none" motionKey={0} animated={false} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5"><span className="truncate text-[14px] font-semibold">{bot.name}</span>
          {bot.chiefOfStaff && <Crown size={12} className="shrink-0 text-warning" aria-label={t("chat.chiefOfStaff")} />}</span>
        <span className="mt-1 block truncate text-[12px] text-ink-secondary">{bot.title || (bot.chiefOfStaff ? t("chat.chiefOfStaff") : t("canvas.bot"))}</span>
      </span>
    </button>
    {computer && frame && <div className="px-3 pb-2">
      <div className="aspect-[16/10] overflow-hidden rounded-lg border border-hairline/40 bg-inset">
        <img src={frame.url} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-secondary"><Monitor size={11} className="shrink-0" /><span className="truncate">{computer.name}</span></p>
    </div>}
    <div className="mt-auto flex h-10 items-center gap-1 border-t border-hairline/40 px-2">
      <button className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-control hover:text-ink focus-visible:outline-2 focus-visible:outline-accent" aria-label={t("canvas.openBotChat", { name: bot.name })} title={t("canvas.openChat")}
        onClick={() => openBot(dispatch, bot, showThreads)}><MessageCircle size={14} /></button>
      {status.tone !== "idle" && <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-secondary" title={status.label}>
        <span className={cn("size-1.5 shrink-0 rounded-full", status.tone === "success" ? "bg-success" : status.tone === "warning" ? "bg-warning" : status.tone === "danger" ? "bg-danger" : "bg-ink-secondary/35")} />
        <span className="truncate">{status.label}</span>
      </span>}
      {hasComputer && onComputer && <button className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-control hover:text-ink focus-visible:outline-2 focus-visible:outline-accent" aria-label={t("canvas.botComputer", { name: bot.name })} title={t("computer.tab.computer")}
        onClick={() => onComputer(bot)}><Monitor size={14} /></button>}
      <button aria-label={t("canvas.changeModel", { name: bot.name })} title={t("canvas.defaultModel") + ": " + model}
        onClick={() => openBotSettings(dispatch, "model", { botId: bot.id })}
        className="ml-auto flex h-6 min-w-0 max-w-[130px] items-center gap-1.5 rounded-lg px-2 text-[11px] text-ink-secondary hover:bg-control hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">
        <span className="flex size-3.5 shrink-0 items-center justify-center">{instance
          ? <InstanceProviderMark instance={instance} size={13} />
          : <ProviderMark driverKind="" size={13} />}</span>
        <span className="truncate">{model || t("canvas.defaultModel")}</span>
      </button>
    </div>
  </article>;
}

function SectionMenu({ section, onMemory, onInstructions, onEditTeam, onDeleteTeam }: {
  section: TeamMapSection<Bot>;
  onMemory: (key: string, label: string) => void;
  onInstructions: (key: string, label: string) => void;
  onEditTeam: (section: string, rename?: boolean) => void;
  onDeleteTeam: (section: string) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<TeamMenuAnchor | null>(null);
  const close = (restoreFocus = true) => {
    const element = details.current;
    setOpen(false);
    setAnchor(null);
    element?.removeAttribute("open");
    if (restoreFocus) element?.querySelector("summary")?.focus({ preventScroll: true });
  };
  const choose = (action: () => void) => { close(true); action(); };
  const show = () => {
    const summary = details.current?.querySelector("summary");
    if (!summary) return;
    const rect = summary.getBoundingClientRect();
    setAnchor({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const panel = menu.current;
    panel?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
    const onDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panel?.contains(event.target) || details.current?.contains(event.target)) return;
      close(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const panel = menu.current;
      if (!panel) return;
      const at = teamMenuPosition(anchor, { width: panel.offsetWidth, height: panel.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
      panel.style.left = `${at.left}px`;
      panel.style.top = `${at.top}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor]);
  return <details ref={details} className="relative shrink-0" onToggle={(event) => {
    if (event.currentTarget.open) show();
    else { setOpen(false); setAnchor(null); }
  }}>
    <summary aria-label={t("canvas.manageTeam", { name: section.name })}
      className="flex size-7 cursor-pointer list-none items-center justify-center rounded-lg text-ink-secondary hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"><MoreHorizontal size={16} /></summary>
    {open && anchor && createPortal(<div ref={menu} data-team-menu role="menu" aria-label={t("canvas.manageTeam", { name: section.name })}
      style={{ left: anchor.right, top: anchor.bottom }}
      className={cn("fixed z-40 w-[220px]", SIMPLE_MENU)}
      onKeyDown={(event) => {
        const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])];
        if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); event.stopPropagation(); close(); return; }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !items.length) return;
        event.preventDefault();
        const index = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
          : event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
        items[next].focus();
      }}>
      <button role="menuitem" className={menuRow} aria-label={t("team.memoryFor", { name: section.name })}
        onClick={() => choose(() => onMemory(section.key, section.name))}><Brain size={16} className="shrink-0 text-ink-secondary" />{t("canvas.departmentMemory")}</button>
      <button role="menuitem" className={menuRow} aria-label={t("team.instructionsEdit", { name: section.name })}
        onClick={() => choose(() => onInstructions(section.key, section.name))}><BookOpen size={16} className="shrink-0 text-ink-secondary" />{t("team.instructions")}</button>
      <div className={MENU_SEPARATOR} />
      <button role="menuitem" className={menuRow}
        onClick={() => choose(() => onEditTeam(section.key))}><Users size={16} className="shrink-0 text-ink-secondary" />{section.key ? t("canvas.manageBots") : t("team.moveTo", { name: section.name })}</button>
      {section.key && <button role="menuitem" className={menuRow} aria-label={t("team.renameAria", { name: section.name })}
        onClick={() => choose(() => onEditTeam(section.key, true))}><Pencil size={16} className="shrink-0 text-ink-secondary" />{t("team.rename")}</button>}
      {section.key && <>
        <div className={MENU_SEPARATOR} />
        <button role="menuitem" className={cn(menuRow, "hover:text-danger focus-visible:text-danger")} aria-label={t("team.deleteAria", { name: section.name })}
          onClick={() => choose(() => onDeleteTeam(section.key))}><Trash2 size={16} className="shrink-0" />{t("team.deleteMenu")}</button>
      </>}
    </div>, document.body)}
  </details>;
}

export function TeamBoard({ sections, canManage, onMove, onInstructions, onMemory, onEditTeam, onDeleteTeam, onComputer, onComputerDrop, onTeamComputer, teamComputers = {}, connectedBotIds = [], computers, computerFrames = {}, taggedBotIds = [], sent }: {
  sections: TeamMapSection<Bot>[];
  canManage: boolean;
  onMove: (bot: Bot, destination: string) => Promise<boolean | void>;
  onInstructions: (key: string, label: string) => void;
  onMemory: (key: string, label: string) => void;
  onEditTeam: (section: string, rename?: boolean) => void;
  onDeleteTeam: (section: string) => void;
  onComputer?: (bot: Bot) => void;
  onComputerDrop?: (resourceId: string, sectionKey: string) => void;
  onTeamComputer?: (sectionKey: string) => void;
  teamComputers?: Record<string, { name: string; state?: string }>;
  connectedBotIds?: string[];
  computers?: MapComputer[];
  computerFrames?: Record<string, ShownFrame>;
  taggedBotIds?: string[];
  sent?: { botIds: string[]; key: number } | null;
}) {
  const { state, dispatch } = useStore();
  const [botOrders, setBotOrders] = useState<Record<string, string[]>>({});
  const [dragged, setDragged] = useState<Bot | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [computerDropKey, setComputerDropKey] = useState<string | null>(null);
  const [insertion, setInsertion] = useState<{ section: string; botId: string; after: boolean } | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const draggedRef = useRef<Bot | null>(null);
  const storageKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void api("/.well-known/openmausbot/environment", { signal: AbortSignal.timeout(5_000) }).then((environment) => {
      if (!active || typeof environment.environmentId !== "string") return;
      storageKey.current = "omb-team-canvas:" + environment.environmentId;
      try { setBotOrders(parseBotOrders(localStorage.getItem(storageKey.current + ":bot-order"))); } catch {}
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const allBots = useMemo(() => sections.flatMap((section) => [...section.chiefs, ...section.members]), [sections]);
  const personalOrder = (key: string) => Object.hasOwn(botOrders, key) ? botOrders[key] : [];
  const saveBotOrder = (section: TeamMapSection<Bot>, lane: Bot[], bot: Bot, index: number) => {
    const next = { ...botOrders, [section.key]: [
      ...reorderBot(lane, bot.id, index),
      ...orderBots(bot.chiefOfStaff ? section.members : section.chiefs, personalOrder(section.key)).map((item) => item.id),
    ] };
    setBotOrders(next);
    if (storageKey.current) {
      try { localStorage.setItem(storageKey.current + ":bot-order", JSON.stringify(next)); } catch {}
    }
    setAnnouncement(t("canvas.arrangedBot", { name: bot.name, team: section.name }));
  };
  const arrangeBot = (bot: Bot, delta: number) => {
    const section = sections.find((item) => item.key === (bot.section?.trim() ?? ""));
    if (!section) return;
    const lane = orderBots(bot.chiefOfStaff ? section.chiefs : section.members, personalOrder(section.key));
    saveBotOrder(section, lane, bot, lane.findIndex((item) => item.id === bot.id) + delta);
  };
  const insertionAt = (section: TeamMapSection<Bot>, bot: Bot, y: number) => {
    const lane = orderBots(bot.chiefOfStaff ? section.chiefs : section.members, personalOrder(section.key));
    const remaining = lane.filter((item) => item.id !== bot.id);
    const ids = new Set(lane.map((item) => item.id));
    const panel = [...document.querySelectorAll<HTMLElement>("[data-team-key]")].find((element) => element.dataset.teamKey === section.key);
    const cards = [...(panel?.querySelectorAll<HTMLElement>("[data-bot-id]") ?? [])]
      .filter((card) => card.dataset.botId && ids.has(card.dataset.botId));
    const index = remaining.findIndex((item) => {
      const bounds = cards.find((card) => card.dataset.botId === item.id)?.getBoundingClientRect();
      return bounds ? y < bounds.top + bounds.height / 2 : false;
    });
    return { lane, index: index < 0 ? remaining.length : index, botId: index < 0 ? remaining.at(-1)?.id : remaining[index]?.id, after: index < 0 };
  };
  const startDrag = (event: DragEvent<HTMLElement>, bot: Bot) => {
    draggedRef.current = bot;
    setDragged(bot);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(BOT_DRAG_TYPE, bot.id);
  };
  const endDrag = () => {
    draggedRef.current = null;
    setDragged(null);
    setDropKey(null);
    setComputerDropKey(null);
    setInsertion(null);
  };
  const overSection = (section: TeamMapSection<Bot>, event: DragEvent<HTMLElement>) => {
    const types = [...event.dataTransfer.types];
    if (types.includes(COMPUTER_DRAG_TYPE)) {
      if (!canManage || !onComputerDrop) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "link";
      setComputerDropKey(section.key);
      return;
    }
    if (!types.includes(BOT_DRAG_TYPE)) return;
    const bot = draggedRef.current;
    if (!bot) return;
    const same = (bot.section?.trim() ?? "") === section.key;
    if (!same && !canManage) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropKey(section.key);
    if (same) {
      const at = insertionAt(section, bot, event.clientY);
      setInsertion(at.botId ? { section: section.key, botId: at.botId, after: at.after } : null);
    } else setInsertion(null);
  };
  const dropOnSection = (section: TeamMapSection<Bot>, event: DragEvent<HTMLElement>) => {
    const types = [...event.dataTransfer.types];
    if (types.includes(COMPUTER_DRAG_TYPE)) {
      const resourceId = event.dataTransfer.getData(COMPUTER_DRAG_TYPE);
      setComputerDropKey(null);
      if (!canManage || !onComputerDrop || !resourceId) return;
      event.preventDefault();
      onComputerDrop(resourceId, section.key);
      return;
    }
    const bot = draggedRef.current ?? allBots.find((item) => item.id === event.dataTransfer.getData(BOT_DRAG_TYPE));
    endDrag();
    if (!bot) return;
    event.preventDefault();
    if ((bot.section?.trim() ?? "") === section.key) {
      const at = insertionAt(section, bot, event.clientY);
      saveBotOrder(section, at.lane, bot, at.index);
      return;
    }
    if (!canManage) return;
    setMoving(bot.id);
    setAnnouncement(t("canvas.reviewMove", { name: bot.name, team: section.name }));
    void onMove(bot, section.key).then((moved) => {
      setAnnouncement(moved === false ? t("canvas.moveCancelled") : t("canvas.moved", { name: bot.name, team: section.name }));
    }).catch((error: unknown) => {
      setAnnouncement(error instanceof Error ? error.message : String(error));
    }).finally(() => setMoving(null));
  };
  const total = allBots.length;
  if (total === 0) {
    return <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[360px] rounded-2xl border border-hairline/40 bg-panel p-6 text-center">
        <p className="text-[15px] font-semibold text-ink">{t("canvas.emptyTeam")}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{t("canvas.emptyTeamBody")}</p>
        <button type="button" className="ui-button ui-button-primary mt-4" onClick={() => dispatch({ type: "newBot" })}><Plus size={15} />{t("sidebar.newBot")}</button>
      </div>
    </div>;
  }
  return <div role="region" aria-label={t("canvas.region")} data-team-board tabIndex={0} className="mx-auto w-full max-w-[1400px] px-5 pb-6 pt-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 md:px-6">
    <p className="mb-3 text-[12px] text-ink-secondary">{t("canvas.boardHint")}</p>
    <p role="status" aria-live="polite" className="sr-only">{dropKey ? t("canvas.moveBot", { name: dragged?.name ?? "", team: sections.find((section) => section.key === dropKey)?.name ?? "" }) : announcement}</p>
    <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1440px]:grid-cols-3">
      {sections.map((section) => {
        const bots = [...orderBots(section.chiefs, personalOrder(section.key)), ...orderBots(section.members, personalOrder(section.key))];
        const count = bots.length;
        const computer = Object.hasOwn(teamComputers, section.key) ? teamComputers[section.key] : undefined;
        const dropping = computerDropKey === section.key || (dragged !== null && dropKey === section.key && (dragged.section?.trim() ?? "") !== section.key);
        const hint = computerDropKey === section.key ? t("canvas.assignComputer", { team: section.name })
          : dragged && dropKey === section.key ? ((dragged.section?.trim() ?? "") === section.key ? t("canvas.arrangeBot", { name: dragged.name, team: section.name }) : t("canvas.moveBot", { name: dragged.name, team: section.name }))
            : null;
        return <section key={section.key} data-team-key={section.key} aria-label={t("canvas.teamRegion", { name: section.name })}
          onDragOver={(event) => overSection(section, event)} onDragLeave={(event) => {
            if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
            setDropKey((current) => current === section.key ? null : current);
            setComputerDropKey((current) => current === section.key ? null : current);
            setInsertion(null);
          }} onDrop={(event) => dropOnSection(section, event)}
          className={cn("relative flex min-w-0 flex-col rounded-2xl border bg-panel transition-colors has-[details[open]]:z-20",
            dropping ? "border-accent ring-2 ring-accent/25" : "border-hairline/40")}>
          {dropping && hint && <div className="pointer-events-none absolute -top-3 left-3 z-10 max-w-[calc(100%-24px)] truncate rounded-md bg-accent px-2 py-1 text-[11px] text-accent-ink shadow-sm">{hint}</div>}
          <header className="relative flex h-12 items-center gap-2 pl-4 pr-3">
            <h2 title={section.name} className="min-w-0 flex-1 truncate text-[14px] font-semibold">{section.name}</h2>
            {computer && <button aria-label={t("canvas.teamComputer", { team: section.name, name: computer.name })} title={computer.name + (computer.state ? " · " + computer.state : "")}
              disabled={!onTeamComputer} onClick={() => onTeamComputer?.(section.key)}
              className="flex min-w-0 max-w-[140px] shrink items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-ink-secondary hover:bg-control hover:text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none">
              <Monitor size={12} className="shrink-0" /><span className="truncate">{computer.name}</span>
            </button>}
            <span className="shrink-0 text-[12px] tabular-nums text-ink-secondary">{teamMapBotCount(count)}</span>
            {canManage && <SectionMenu section={section} onMemory={onMemory} onInstructions={onInstructions} onEditTeam={onEditTeam} onDeleteTeam={onDeleteTeam} />}
          </header>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,208px),1fr))] gap-3 px-4 pb-4">
            {bots.map((bot) => {
              const selected = state.selectedId === bot.id && state.settingsOpen;
              const computerFor = computers ? computerForBot(computers, bot.id) : undefined;
              const frame = computerFor ? computerFrames[computerFor.id] : undefined;
              return <div key={bot.id} className="relative min-w-0">
                {insertion?.section === section.key && insertion.botId === bot.id && <div className={cn("pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded bg-accent", insertion.after ? "-bottom-[7px]" : "-top-[7px]")} />}
                <BotCard bot={bot} selected={selected} moving={dragged?.id === bot.id || moving === bot.id} connected={connectedBotIds.includes(bot.id)} hasComputer={bot.computer === "cloud" || Boolean(computer)}
                  tagged={taggedBotIds.includes(bot.id)} sent={sent?.botIds.includes(bot.id) ? sent.key : undefined}
                  computer={computerFor} frame={frame} onComputer={onComputer} onArrange={arrangeBot} onDragStart={startDrag} onDragEnd={endDrag} />
              </div>;
            })}
            {count === 0 && <div className="col-span-full flex h-[104px] items-center justify-center rounded-xl border border-dashed border-hairline/70 px-6 text-center text-[12px] leading-relaxed text-ink-secondary">{t("canvas.dropHereTeam", { team: section.name })}</div>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
