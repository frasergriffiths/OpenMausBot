import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, FolderMinus } from "lucide-react";
import { useStore } from "@/state/store";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { useHeldMenuMotion } from "./MenuMotion";
import { anchoredMenuPosition } from "./SidebarPopoverMenu";
import { MENU_LABEL } from "./menu-recipe";
import { SIMPLE_MENU, SIMPLE_MENU_ITEM, SIMPLE_MENU_SEPARATOR } from "./SidebarSimpleTop";

/** "Move to context": the sidebar sections in use, a field for a new one, and "remove from context". */
export function SectionPicker({
  current,
  anchor,
  onClose,
  onAssign,
}: {
  current: string | undefined;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  onAssign: (section: string) => void;
}) {
  const { state } = useStore();
  const [name, setName] = useState("");
  const motion = useHeldMenuMotion(anchor);
  const shown = motion.value;
  const panelRef = useRef<HTMLDivElement>(null);
  const heldCurrent = useRef(current);
  if (anchor) heldCurrent.current = current;
  const trimmed = name.trim();

  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-section-picker]")) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onClose);
    };
  }, [anchor, onClose]);

  // The panel grows with the section list, so measure it on every render: below the click with a 6px gap, flipped
  // above when it does not fit, then held 8px inside every edge.
  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element || !shown) return;
    const place = () => {
      const { width, height } = element.getBoundingClientRect();
      const at = anchoredMenuPosition(
        { left: shown.x, right: shown.x, top: shown.y, bottom: shown.y },
        { width, height },
        { width: window.innerWidth, height: window.innerHeight },
      );
      element.style.left = `${at.left}px`;
      element.style.top = `${at.top}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  });

  const sections = [
    ...new Set([
      ...(state.sections ?? []),
      ...state.bots.filter((b) => !b.hidden && b.section).map((b) => b.section!),
      ...state.groups.filter((g) => g.section).map((g) => g.section!),
    ]),
  ];

  const assign = (section: string) => {
    onAssign(section);
    onClose();
  };

  if (!motion.shown || !shown) return null;
  const sectionCurrent = heldCurrent.current;

  return (
    <div
      ref={panelRef}
      data-section-picker
      style={{ top: shown.y, left: shown.x }}
      className={cn("fixed z-40 max-h-[calc(100dvh-16px)] w-max min-w-[220px] max-w-[calc(100vw-16px)] overflow-y-auto overscroll-contain", SIMPLE_MENU, motion.className)}
      {...motion.exitProps}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className={MENU_LABEL}>{t("sidebar.section.moveToContext")}</div>
      {sections.map((section) => (
        <button
          key={section}
          type="button"
          onClick={() => assign(section)}
          className={cn(
            SIMPLE_MENU_ITEM,
            "text-ink hover:bg-menu-hover",
            section === sectionCurrent && "bg-menu-active",
          )}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            {section === sectionCurrent && <Check size={16} className="text-accent" />}
          </span>
          <span className="min-w-0 flex-1 truncate">{section}</span>
        </button>
      ))}
      {sections.length > 0 && <div role="separator" className={SIMPLE_MENU_SEPARATOR} />}
      <form
        className="flex min-h-[30px] items-center gap-1.5 px-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed || trimmed.length > 60) return;
          assign(trimmed);
        }}
      >
        <input
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("sidebar.section.newContext")}
          aria-label={t("sidebar.section.newContextAria")}
          className="ui-field ui-field-sm min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={!trimmed || trimmed.length > 60}
          className="ui-button ui-button-primary ui-button-md shrink-0"
        >
          {t("common.add")}
        </button>
      </form>
      {sectionCurrent && (
        <>
          <div role="separator" className={SIMPLE_MENU_SEPARATOR} />
          <button
            type="button"
            onClick={() => assign("")}
            className={cn(SIMPLE_MENU_ITEM, "text-danger hover:bg-menu-hover")}
          >
            <FolderMinus size={16} />
            {t("sidebar.section.removeFromContext")}
          </button>
        </>
      )}
    </div>
  );
}
