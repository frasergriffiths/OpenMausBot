import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { EffectivePlace } from "@/lib/place";
import { placeCopy, PLACE_ORDER } from "@/lib/place-copy";
import { usePlaceViews } from "@/components/PlaceChip";
import { useMenuMotion } from "@/components/MenuMotion";
import { usePopoverDismiss } from "@/hooks/use-popover-dismiss";
import { useDesktopCapabilities } from "@/components/DesktopCapabilities";
import { LocalComputerAutoWarning } from "@/components/LocalComputerAutoWarning";
import type { Bot } from "@/state/store";
import type { BotPatch } from "@/components/bot-settings/useBotSettingsDerived";

export type PlaceControlPatch = (value: BotPatch & { acknowledgeLocalAuto?: boolean }) => void;

/** One place control, used by the bot panel, Access and the New bot step: a two-line trigger and a six-row menu.
 *  The name, state, consequence and needs come from one table, so no surface invents its own vocabulary. */
export function PlaceControl({ bot, patch, approvalMode, className, dataAttr }: {
  bot: Bot;
  patch: PlaceControlPatch;
  approvalMode?: string;
  className?: string;
  dataAttr?: string;
}) {
  const { capabilities } = useDesktopCapabilities();
  const platform = capabilities.host?.platform ?? "other";
  const views = usePlaceViews(bot);
  const [open, setOpen] = useState(false);
  const [warning, setWarning] = useState<BotPatch | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
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
  const issue = liveSurface && liveSurface !== current ? placeCopy(liveSurface, views[liveSurface].view, platform).name : null;
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
      const width = menu.offsetWidth, height = menu.offsetHeight, edge = 8, gap = 6;
      const below = box.bottom + gap;
      const top = below + height > window.innerHeight - edge && box.top - gap - height >= edge ? box.top - gap - height : below;
      setPosition({ left: Math.min(Math.max(edge, box.left), Math.max(edge, window.innerWidth - width - edge)), top: Math.min(Math.max(edge, top), Math.max(edge, window.innerHeight - height - edge)) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [motion.shown]);

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
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex w-full min-w-0 flex-col rounded-xl bg-card px-4 py-3 text-left transition-colors hover:bg-raised/50",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
          )}
        >
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
        </button>
        {issue && <p data-panel-using-now className="mx-1 mt-1 text-[13px] text-ink-secondary">{t("computer.simple.usingNow", { place: issue })}</p>}
      </div>
      {typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("computer.simple.whereWorks", { name: bot.name })}
          style={{ position: "fixed", left: position?.left ?? 8, top: position?.top ?? 8, visibility: position ? undefined : "hidden" }}
          className={cn("popover-surface z-[60] flex w-[300px] max-w-[calc(100vw-16px)] flex-col gap-0.5 overflow-y-auto rounded-[var(--radius-menu)] border border-hairline/50 bg-menu p-1.5 shadow-lg", motion.className)}
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
              className={cn("flex min-h-10 w-full min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-left", current === option.value ? "bg-ink/[0.06]" : "hover:bg-raised", option.disabled && "cursor-not-allowed opacity-50")}
            >
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">{current === option.value && <Check size={14} className="text-accent" aria-hidden="true" />}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium leading-[18px] text-ink">{option.copy.name}</span>
                <span className="line-clamp-2 text-[12px] leading-4 text-ink-secondary">{option.copy.line}</span>
                {(option.copy.needs || option.disabled) && <span className={cn("mt-0.5 truncate text-[12px] leading-4", option.disabled ? "text-warning" : "text-ink-tertiary")}>{option.disabled ? option.reason || option.copy.needs : option.copy.needs}</span>}
              </span>
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
