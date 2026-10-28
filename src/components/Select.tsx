import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAdvancedMode } from "@/lib/interface-mode";
import { isTypeaheadKey, typeaheadMatch, typeaheadText } from "@/lib/menu-keys";
import { usePopoverDismiss } from "@/hooks/use-popover-dismiss";
import { MENU_LABEL, MENU_ROW } from "./menu-recipe";
import { useMenuMotion } from "./MenuMotion";

const VARIANTS = {
  field: "rounded-lg border border-hairline/40 bg-inset text-ink",
  pill: "rounded-full border border-hairline/40 bg-raised/60 font-medium text-ink hover:bg-raised",
  ghost: "rounded-lg border-[0.5px] [border-color:var(--settings-edge,color-mix(in_srgb,var(--color-ink)_8%,transparent))] bg-transparent text-ink hover:bg-ink/[0.06]",
  quiet: "rounded-lg bg-transparent text-ink hover:bg-ink/[0.06]",
} as const;

// The 14px chevron draws its stroke ~3.5px inside its box, so the box sits that much nearer the edge than the text's padding.
const SIZES = {
  lg: { trigger: "h-10 pl-3 pr-8 text-[14px] leading-5", chevron: "right-2.5" },
  md: { trigger: "h-9 pl-3 pr-7 text-[13px] leading-[18px]", chevron: "right-2" },
  sm: { trigger: "h-7 pl-2.5 pr-7 text-[13px] leading-4", chevron: "right-2" },
} as const;

const GHOST_SIZE = "h-7 pl-2.5 pr-6 text-[13px] leading-4";

// Advanced mode keeps the exact native control it had.
const NATIVE_VARIANTS = {
  field: "rounded-lg border border-hairline/40 bg-inset text-ink",
  pill: "h-8 rounded-full border border-hairline/40 bg-raised/60 font-medium text-ink hover:bg-raised",
  ghost: "h-7 rounded-lg border-[0.5px] [border-color:var(--settings-edge,color-mix(in_srgb,var(--color-ink)_8%,transparent))] bg-transparent text-ink hover:bg-ink/[0.06] [field-sizing:content]",
  quiet: "rounded-md bg-ink/[0.05] text-ink outline-none hover:bg-ink/[0.08] focus-visible:ring-[1.5px] focus-visible:ring-focus",
} as const;
const NATIVE_SIZES = {
  lg: { trigger: "py-2.5 pl-3 pr-9 text-[15px]", chevron: "right-2" },
  md: { trigger: "py-2 pl-3 pr-9 text-[13px]", chevron: "right-2" },
  sm: { trigger: "py-1.5 pl-2.5 pr-8 text-[13px]", chevron: "right-1.5" },
} as const;
const EDGE_MARGIN = 8;
const MENU_GAP = 4;

type SelectProps = Omit<ComponentProps<"select">, "size"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

interface OptionEntry {
  value: string;
  label: string;
  disabled: boolean;
}

interface MenuEntry {
  kind: "group" | "option";
  label?: string;
  option?: OptionEntry;
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/** Read <option> and <optgroup> children without changing the public Select API. */
export function readSelectOptions(children: ReactNode): { options: OptionEntry[]; entries: MenuEntry[] } {
  const options: OptionEntry[] = [];
  const entries: MenuEntry[] = [];
  const visit = (nodes: ReactNode) => {
    for (const child of Children.toArray(nodes)) {
      if (!isValidElement(child)) continue;
      if (child.type === Fragment) {
        visit((child as ReactElement<{ children?: ReactNode }>).props.children);
        continue;
      }
      if (child.type === "optgroup") {
        const group = child as ReactElement<{ label?: string; children?: ReactNode }>;
        entries.push({ kind: "group", label: group.props.label ?? "" });
        visit(group.props.children);
        continue;
      }
      if (child.type !== "option") continue;
      const option = child as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
      const label = textOf(option.props.children).trim();
      const value = option.props.value === undefined ? label : String(option.props.value);
      const entry = { value, label, disabled: option.props.disabled === true };
      options.push(entry);
      entries.push({ kind: "option", option: entry });
    }
  };
  visit(children);
  return { options, entries };
}

function nextEnabled(options: OptionEntry[], from: number, step: 1 | -1): number {
  if (!options.length) return -1;
  for (let index = 1; index <= options.length; index += 1) {
    const candidate = (from + step * index + options.length * 2) % options.length;
    if (!options[candidate]!.disabled) return candidate;
  }
  return from;
}

export function Select(props: SelectProps) {
  const advanced = useAdvancedMode();
  return advanced ? <NativeSelect {...props} /> : <SimpleSelect {...props} />;
}

function NativeSelect({ className, variant = "field", size = "md", ...props }: SelectProps) {
  return (
    <div className={cn("relative inline-flex min-w-0", className)}>
      <select
        {...props}
        className={cn(
          "peer w-full min-w-0 cursor-pointer appearance-none truncate disabled:cursor-default disabled:opacity-50",
          NATIVE_VARIANTS[variant],
          variant === "ghost" ? "pl-2.5 pr-[18px] text-[13px]" : NATIVE_SIZES[size].trigger,
        )}
      />
      <ChevronDown
        size={variant === "ghost" ? 12 : 14}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-secondary peer-disabled:opacity-50",
          variant === "ghost" ? "right-1" : NATIVE_SIZES[size].chevron,
        )}
      />
    </div>
  );
}

function SimpleSelect({ className, variant = "field", size = "md", value, onChange, disabled, children, id, name, title, autoFocus, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, "aria-describedby": ariaDescribedBy, ...rest }: SelectProps) {
  const { options, entries } = readSelectOptions(children);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const typed = useRef<{ text: string; at: number } | null>(null);
  const menuId = useId();
  const motion = useMenuMotion(open);
  const selectedValue = value === undefined ? options[0]?.value : String(value);
  const selected = options.find((option) => option.value === selectedValue);
  const empty = options.length === 0;
  const isDisabled = disabled === true || empty;

  const close = useCallback((refocus = false) => {
    setOpen(false);
    setPosition(null);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openMenu = (from: "first" | "last" | "selected") => {
    if (isDisabled) return;
    const selectedIndex = options.findIndex((option) => option.value === selectedValue);
    const firstEnabled = options.findIndex((option) => !option.disabled);
    const lastEnabled = options.reduce((last, option, index) => (option.disabled ? last : index), -1);
    setActive(from === "last" ? lastEnabled : from === "selected" && selectedIndex >= 0 && !options[selectedIndex]!.disabled ? selectedIndex : firstEnabled);
    setOpen(true);
  };

  const choose = (option: OptionEntry) => {
    if (option.disabled) return;
    close(true);
    if (option.value !== selectedValue) onChange?.({ target: { value: option.value } } as unknown as React.ChangeEvent<HTMLSelectElement>);
  };

  const insideRef = useRef({
    contains: (target: unknown) =>
      [rootRef.current, menuRef.current].some((node) => node?.contains(target as Node)),
  });
  usePopoverDismiss(open, insideRef, () => close());

  useLayoutEffect(() => {
    if (!motion.shown) return;
    const place = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 180), 320);
      const maxHeight = Math.min(320, window.innerHeight * 0.6);
      const menuHeight = Math.min(menu.offsetHeight, maxHeight);
      const below = rect.bottom + MENU_GAP;
      const above = rect.top - MENU_GAP - menuHeight;
      const flip = below + menuHeight > window.innerHeight - EDGE_MARGIN && above >= EDGE_MARGIN;
      const left = Math.min(Math.max(rect.left, EDGE_MARGIN), Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN));
      setPosition({ left, top: flip ? above : below, width, maxHeight });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [motion.shown, options.length]);

  useEffect(() => {
    if (!open || !position) return;
    const rows = menuRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    rows?.[active]?.focus({ preventScroll: true });
  }, [open, position, active]);

  const move = (step: 1 | -1) => {
    const start = active < 0 ? (step === 1 ? -1 : 0) : active;
    setActive(nextEnabled(options, start, step));
  };

  const onMenuKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    if (event.key === "Escape") {
      handled();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      handled();
      close(false);
      const trigger = triggerRef.current;
      const focusable = [...document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getClientRects().length > 0 && !menuRef.current?.contains(element));
      const index = trigger ? focusable.indexOf(trigger) : -1;
      focusable[index + (event.shiftKey ? -1 : 1)]?.focus();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      handled();
      const option = options[active];
      if (option) choose(option);
      else close(true);
      return;
    }
    if (event.key === "ArrowDown") {
      handled();
      move(1);
      return;
    }
    if (event.key === "ArrowUp") {
      handled();
      move(-1);
      return;
    }
    if (event.key === "Home") {
      handled();
      setActive(nextEnabled(options, -1, 1));
      return;
    }
    if (event.key === "End") {
      handled();
      setActive(nextEnabled(options, options.length, -1));
      return;
    }
    const continuing = event.key === " " && typed.current !== null && event.timeStamp - typed.current.at < 800;
    if (!isTypeaheadKey(event) && !continuing) return;
    if (continuing) handled();
    typed.current = typeaheadText(typed.current, event.key, event.timeStamp);
    const match = typeaheadMatch(options.map((option) => option.label), active, typed.current.text);
    if (match !== null) {
      const first = options.findIndex((option) => !option.disabled);
      setActive(match >= 0 && !options[match]!.disabled ? match : first);
    }
  };

  const onClick = () => {
    if (open) close(true);
    else openMenu("selected");
  };

  return (
    <div ref={rootRef} className={cn("relative inline-flex min-w-0", className)}>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        data-select-value={selectedValue ?? ""}
        data-select-values={options.map((option) => option.value).join("|")}
        data-select-labels={options.map((option) => option.label).join("|")}
        data-select-groups={entries.filter((entry) => entry.kind === "group").map((entry) => entry.label).join("|")}
        {...(rest as Record<string, unknown>)}
        title={title}
        disabled={isDisabled}
        autoFocus={autoFocus}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowUp" ? "last" : "selected");
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMenu("selected");
          }
        }}
        className={cn(
          "relative flex w-full min-w-0 cursor-pointer items-center truncate text-left disabled:cursor-default disabled:opacity-50",
          VARIANTS[variant],
          variant === "ghost" ? GHOST_SIZE : SIZES[size].trigger,
          open && "bg-ink/[0.06]",
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? ""}</span>
        <ChevronDown
          size={variant === "ghost" ? 12 : 14}
          strokeWidth={1.75}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-secondary transition-transform motion-reduce:transition-none rtl:-scale-x-100",
            variant === "ghost" ? "right-1" : SIZES[size].chevron,
            open && "rotate-180",
          )}
        />
      </button>

      {motion.shown && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          tabIndex={-1}
          {...motion.exitProps}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={onMenuKey}
          style={{
            position: "fixed",
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            width: position?.width ?? 180,
            maxHeight: position?.maxHeight ?? 320,
            visibility: position ? undefined : "hidden",
          }}
          className={cn(
            "menu-surface z-[80] flex flex-col gap-0.5 overflow-y-auto overscroll-contain p-1.5",
            motion.className,
          )}
        >
          {entries.map((entry, index) => {
            if (entry.kind === "group") return <div key={`group-${index}`} role="presentation" className={MENU_LABEL}>{entry.label}</div>;
            const option = entry.option!;
            const activeIndex = options.indexOf(option);
            return (
              <button
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === selectedValue}
                disabled={option.disabled}
                tabIndex={-1}
                onClick={() => choose(option)}
                onFocus={() => setActive(activeIndex)}
                onPointerMove={() => setActive(activeIndex)}
                className={cn(MENU_ROW, "text-left", option.value === selectedValue && "font-normal")}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {option.value === selectedValue && <Check size={14} className="text-accent" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
