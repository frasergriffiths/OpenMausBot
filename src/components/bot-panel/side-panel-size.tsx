import { useCallback, useRef, useState, type PointerEvent } from "react";

import { t } from "@/lib/i18n";

export const SIDE_PANEL_WIDTH_KEYS = {
  simple: "openmausbot.sidePanelWidth.simple",
} as const;

const BOUNDS = {
  simple: { default: 320, min: 280, max: 420 },
} as const;

const STEP = 16;
/** Room the chat needs beside the sidebar and the panel before the panel may take the rest. */
const CHAT_FLOOR = 320;

export function sidePanelWidthBounds(_simple: boolean) {
  return BOUNDS.simple;
}

export function clampSidePanelWidth(width: number, simple: boolean, effectiveMax: number): number {
  const bounds = sidePanelWidthBounds(simple);
  return Math.round(Math.min(Math.max(bounds.min, effectiveMax), Math.max(bounds.min, width)));
}

export function readSidePanelWidth(simple: boolean, storage: Pick<Storage, "getItem"> | undefined = typeof localStorage === "undefined" ? undefined : localStorage): number {
  const bounds = sidePanelWidthBounds(simple);
  try {
    const stored = Number(storage?.getItem(SIDE_PANEL_WIDTH_KEYS.simple));
    if (Number.isFinite(stored) && stored >= bounds.min && stored <= bounds.max) return Math.round(stored);
  } catch {
  }
  return bounds.default;
}

/** The room a panel may take on this window: its mode's cap, or whatever is left once the sidebar and the chat's
 *  floor are paid for. Read at drag start, so resizing never changes the sidebar. */
export function sidePanelEffectiveMax(simple: boolean): number {
  const bounds = sidePanelWidthBounds(simple);
  const sidebar = typeof document === "undefined" ? undefined : document.querySelector<HTMLElement>("[data-sidebar]");
  const sidebarWidth = sidebar?.getBoundingClientRect().width ?? 280;
  return Math.max(bounds.min, Math.min(bounds.max, (typeof window === "undefined" ? 1280 : window.innerWidth) - sidebarWidth - CHAT_FLOOR));
}

export interface SidePanelSizing {
  width: number;
  min: number;
  max: number;
  resizing: boolean;
  handleProps: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    onDoubleClick: () => void;
  };
}

/** One width for both side panels, per interface mode: the bot panel and a room panel share it, and it survives a
 *  close. Only the drag edge resizes; opening a panel never grows it. */
export function useSidePanelWidth({ simple, active }: { simple: boolean; active: boolean }): SidePanelSizing {
  const bounds = sidePanelWidthBounds(simple);
  const [width, setWidth] = useState(() => readSidePanelWidth(simple));
  const widthRef = useRef(width);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ x: number; width: number; max: number } | null>(null);
  const maxRef = useRef(sidePanelEffectiveMax(simple));

  const save = useCallback((next: number) => {
    try {
      localStorage.setItem(SIDE_PANEL_WIDTH_KEYS.simple, String(next));
    } catch {
    }
  }, [simple]);

  const apply = useCallback((next: number) => {
    const clamped = clampSidePanelWidth(next, simple, maxRef.current);
    widthRef.current = clamped;
    setWidth(clamped);
    return clamped;
  }, [simple]);

  const rtl = () => typeof document !== "undefined" && document.documentElement.dir === "rtl";

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!active || event.button !== 0) return;
    maxRef.current = sidePanelEffectiveMax(simple);
    drag.current = { x: event.clientX, width: widthRef.current, max: maxRef.current };
    setResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = (drag.current.x - event.clientX) * (rtl() ? -1 : 1);
    apply(drag.current.width + dx);
  };
  const stop = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    setResizing(false);
    save(widthRef.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    maxRef.current = sidePanelEffectiveMax(simple);
    const flip = rtl() ? -1 : 1;
    const step = event.key === "ArrowLeft" ? STEP * flip : event.key === "ArrowRight" ? -STEP * flip : 0;
    if (step !== 0) {
      event.preventDefault();
      save(apply(widthRef.current + step));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      save(apply(event.key === "Home" ? bounds.min : maxRef.current));
    }
  };
  const onDoubleClick = () => {
    maxRef.current = sidePanelEffectiveMax(simple);
    save(apply(bounds.default));
  };

  return {
    width: Math.min(width, Math.max(bounds.min, maxRef.current)),
    min: bounds.min,
    max: Math.max(bounds.min, maxRef.current),
    resizing,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: stop, onPointerCancel: stop, onKeyDown, onDoubleClick },
  };
}

/** The panel's drag edge: 8px straddling the border, no grip, keyboard and double-click included. */
export function SidePanelResizeHandle({ sizing }: { sizing: SidePanelSizing }) {
  return (
    <div
      {...sizing.handleProps}
      role="separator"
      aria-orientation="vertical"
      aria-label={t("computer.resizeAria")}
      aria-valuemin={sizing.min}
      aria-valuemax={sizing.max}
      aria-valuenow={Math.round(sizing.width)}
      tabIndex={0}
      data-side-panel-resize
      className="absolute inset-y-0 -start-1 z-20 hidden w-2 cursor-col-resize touch-none select-none focus-visible:bg-accent/30 focus-visible:outline-none hover:bg-accent/20 md:block"
    />
  );
}
