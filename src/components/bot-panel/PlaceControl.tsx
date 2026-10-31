import { useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { EffectivePlace } from "@/lib/place";
import { livePlaceLabel, placeCopy, PLACE_ORDER } from "@/lib/place-copy";
import { usePlaceViews } from "@/components/PlaceChip";
import { PlaceIcon } from "@/components/PlaceIcon";
import { useMenuMotion } from "@/components/MenuMotion";
import { usePopoverDismiss } from "@/hooks/use-popover-dismiss";
import { useDesktopCapabilities } from "@/components/DesktopCapabilities";
import { LocalComputerAutoWarning } from "@/components/LocalComputerAutoWarning";
import { Chevron } from "@/components/chevron";
import { COMPACT_MENU_WIDTH, nextMenuIndex } from "@/components/SidebarPopoverMenu";
import { SIMPLE_MENU } from "@/components/SidebarSimpleTop";
import { MENU_GUTTER, MENU_ICON, SIMPLE_MENU_META, SIMPLE_MENU_ROW } from "@/components/menu-recipe";
import type { Bot } from "@/state/store";
import type { BotPatch } from "@/components/bot-settings/useBotSettingsDerived";

export type PlaceControlPatch = (value: BotPatch & { acknowledgeLocalAuto?: boolean }) => void;

const EDGE = 8;
const GAP = 6;
/** The rows the arrow keys walk: the menu the shared recipe draws, minus the ones it cannot pick. */
const placeRows = (menu: HTMLElement | null) =>
  menu ? [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]:not(:disabled)')] : [];

/** The place in one read-only line, for a recap: the name and consequence come from the same table the control draws. */
export function PlaceAnswer({ bot }: { bot: Bot }) {
  const { capabilities } = useDesktopCapabilities();
  const platform = capabilities.host?.platform ?? "other";
  const views = usePlaceViews(bot);
  const current = (bot.computer ?? "auto") as EffectivePlace;
  const view = current === "auto" || current === "off" ? undefined : views[current].view;
  const copy = placeCopy(current, view, platform);
  return (
    <span data-place-answer="" className="flex min-w-0 flex-col">
      <span className="min-w-0 truncate text-[13px] leading-[18px] text-ink">{copy.name}</span>
      {copy.line && <span className="min-w-0 truncate text-[12px] leading-4 text-ink-secondary">{copy.line}</span>}
    </span>
  );
}

/** One place control, used by the bot profile and the setup card: a two-line trigger and a menu of the places.
 *  The name, state, consequence and needs come from one table, so no surface invents its own vocabulary; the menu is
 *  the shared sheet (popover-surface, --radius-menu, 240px, 30px rows, 16px icons, shadow-lg, pop-in/pop-out) with the
 *  same arrow-key walk as the sidebar's menus. */
export function PlaceControl({ bot, patch, approvalMode, className, dataAttr, disabled = false }: {
  bot: Bot;
  patch: PlaceControlPatch;
  approvalMode?: string;
  className?: string;
  dataAttr?: string;
  /** Read-only: the card that asks once keeps its answer. */
  disabled?: boolean;
}) {
  const { capabilities } = useDesktopCapabilities();
  const platform = capabilities.host?.platform ?? "other";
  const views = usePlaceViews(bot);
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState<BotPatch | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const focusRow = useRef(false);
  const motion = useMenuMotion(open);
  const inside = useRef({ contains: (target: unknown) => triggerRef.current?.contains(target as Node) === true || menuRef.current?.contains(target as Node) === true });
  usePopoverDismiss(open, inside, () => setOpen(false));

  const current = (bot.computer ?? "auto") as EffectivePlace;
  const options = PLACE_ORDER.flatMap((value) => {
    if (value === "off") return [];
    if (value !== "auto") {
      const policy = value === "local" ? views.local.policy : value === "browser" ? views.browser.policy : value === "cloud" ? views.cloud.policy : views.vm.policy;
      if (!policy && value !== current) return [];
    }
    const view = value === "auto" ? undefined : views[value].view;
    const reachable = value === "auto" ? true : views[value].reachable;
    const copy = placeCopy(value, view, platform);
    return [{ value, copy, disabled: !reachable, reason: copy.needs }];
  });
  const liveSurface = bot.tasks?.find((task) => task.threadId === bot.threadId)?.surface;
  const issue = liveSurface && liveSurface !== current ? livePlaceLabel(liveSurface, platform) : null;
  const selected = options.find((option) => option.value === current) ?? options[0]!;

  const choose = (value: EffectivePlace) => {
    if (value === current) { setOpen(false); return; }
    setOpen(false);
    if (value === "local" && approvalMode === "auto") {
      setWarning({ computer: "local", acknowledgeLocalAuto: true });
      return;
    }
    if (value === "browser") { patch({ computer: "browser", browser: true }); return; }
    patch({ computer: value === "auto" ? null : value });
  };

  useLayoutEffect(() => {
    if (!motion.shown) { setPosition(null); return; }
    const place = () => {
      const trigger = triggerRef.current, menu = menuRef.current;
      if (!trigger || !menu) return;
      const box = trigger.getBoundingClientRect();
      const width = menu.offsetWidth, height = menu.offsetHeight;
      const below = box.bottom + GAP;
      const top = below + height > window.innerHeight - EDGE && box.top - GAP - height >= EDGE ? box.top - GAP - height : below;
      setPosition({ left: Math.min(Math.max(EDGE, box.left), Math.max(EDGE, window.innerWidth - width - EDGE)), top: Math.min(Math.max(EDGE, top), Math.max(EDGE, window.innerHeight - height - EDGE)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [motion.shown]);

  // A menu opened from the keyboard lands on the place in use, the way the sidebar's menus land on their first row.
  useLayoutEffect(() => {
    if (!open || !focusRow.current || !position) return;
    focusRow.current = false;
    const rows = placeRows(menuRef.current);
    (rows.find((row) => row.getAttribute("aria-checked") === "true") ?? rows[0])?.focus();
  }, [open, position]);

  const onMenuKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const rows = placeRows(event.currentTarget);
    const next = nextMenuIndex(event.key, rows.indexOf(document.activeElement as HTMLElement), rows.length);
    if (next != null) {
      event.preventDefault();
      rows[next]?.focus();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <div className={cn("min-w-0", className)} {...(dataAttr ? { [dataAttr]: "" } : {})}>
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("computer.simple.placeAria", { name: bot.name, place: selected.copy.name })}
          title={t("computer.simple.placeChange", { name: bot.name })}
          disabled={disabled}
          onClick={(event) => { focusRow.current = event.detail === 0; setOpen((value) => !value); }}
          onKeyDown={(event) => {
            if (open || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
            event.preventDefault();
            focusRow.current = true;
            setOpen(true);
          }}
          className={cn(
            "flex w-full min-w-0 items-center gap-2 rounded-xl bg-card px-4 py-3 text-left transition-colors hover:bg-raised/50",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{selected.copy.name}</span>
              {selected.copy.state && (
                <span className={cn("shrink-0 rounded-full bg-inset px-2 py-0.5 text-[10px]", selected.copy.blocked ? "text-warning" : "text-accent")}>{selected.copy.state}</span>
              )}
            </span>
            <span className="mt-0.5 min-w-0 truncate text-[13px] leading-[18px] text-ink-secondary">{selected.copy.line}</span>
            {selected.copy.needs && (
              <span className={cn("mt-0.5 block min-w-0 truncate text-[12px] leading-4", selected.copy.blocked ? "text-warning" : "text-ink-tertiary")}>{selected.copy.needs}</span>
            )}
          </span>
          <Chevron kind="menu" open={open} size="control" />
        </button>
        {issue && <p data-panel-using-now className="mx-1 mt-1 text-[13px] text-ink-secondary">{t("computer.simple.usingNow", { place: issue })}</p>}
      </div>
      {typeof document !== "undefined" && motion.shown && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("computer.simple.whereWorks", { name: bot.name })}
          data-place-menu=""
          style={{ position: "fixed", left: position?.left ?? EDGE, top: position?.top ?? EDGE, width: COMPACT_MENU_WIDTH, maxWidth: `calc(100vw - ${EDGE * 2}px)`, visibility: position ? undefined : "hidden" }}
          onKeyDown={onMenuKey}
          className={cn(SIMPLE_MENU, "z-[60] max-h-[calc(100vh-16px)] overflow-y-auto", motion.className)}
          {...motion.exitProps}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={current === option.value}
              disabled={option.disabled}
              title={option.disabled ? option.reason : option.copy.line}
              onClick={() => choose(option.value)}
              className={cn(SIMPLE_MENU_ROW, "items-start py-1.5", current === option.value && "bg-ink/[0.06]", option.disabled && "cursor-not-allowed opacity-50")}
            >
              <span className={cn(MENU_GUTTER, MENU_ICON, "mt-0.5")}>
                <PlaceIcon place={option.value} size={16} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] leading-[18px] text-ink">{option.copy.name}</span>
                <span className={cn(SIMPLE_MENU_META, "whitespace-normal text-ink-secondary")}>{option.copy.line}</span>
                {(option.copy.needs || option.disabled) && (
                  <span className={cn(SIMPLE_MENU_META, "whitespace-normal", option.disabled ? "text-warning" : "text-ink-tertiary")}>
                    {option.disabled ? option.reason || option.copy.needs : option.copy.needs}
                  </span>
                )}
              </span>
              {current === option.value && <Check size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
      <LocalComputerAutoWarning
        open={warning !== null}
        onCancel={() => setWarning(null)}
        onConfirm={() => {
          const next = warning;
          setWarning(null);
          if (next) patch(next);
        }}
      />
    </>
  );
}
