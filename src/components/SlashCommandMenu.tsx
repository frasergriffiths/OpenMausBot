import type { RefObject } from "react";
import { BookOpen, Settings2, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { ComposerSlashCommand } from "@/lib/composer-commands";
import { MENU_GUTTER, SIMPLE_MENU_ROW } from "./menu-recipe";
import type { MenuMotion } from "./MenuMotion";

/** The composer's / list: the commands that change the composer, then the bot's skills. */
export function SlashCommandMenu({ listRef, motion, commands, highlight, query = "", onPick, onHighlight }: {
  listRef: RefObject<HTMLDivElement | null>;
  motion: MenuMotion;
  commands: ComposerSlashCommand[];
  highlight: number;
  query?: string;
  onPick: (command: ComposerSlashCommand) => void;
  onHighlight: (index: number) => void;
}) {
  if (!motion.shown) return null;
  const indexed = commands.map((command, index) => ({ command, index }));
  const sections = [
    { id: "commands", label: t("composer.commands.title"), rows: indexed.filter(({ command }) => command.kind === "command"), count: 0 },
    { id: "skills", label: t("composer.commands.skills"), rows: indexed.filter(({ command }) => command.kind === "skill"), count: indexed.filter(({ command }) => command.kind === "skill").length },
  ].filter((section) => section.rows.length > 0);
  return (
    <div
      ref={listRef}
      id="composer-slash-menu"
      role="listbox"
      aria-label={t("composer.commands.aria")}
      className={cn("popover-surface absolute bottom-full left-2 z-40 mb-2 flex max-h-80 w-[min(22.5rem,calc(100%-1rem))] origin-bottom flex-col overflow-hidden rounded-[var(--radius-menu)] border border-hairline/50 bg-menu p-1.5 shadow-lg [&_svg.lucide]:stroke-[1.5]", motion.className)}
      {...motion.exitProps}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,black_calc(100%-12px),transparent)]">
        {sections.map((section) => (
          <div key={section.id} role="group" aria-labelledby={`composer-slash-${section.id}`}>
            <div
              id={`composer-slash-${section.id}`}
              className="sticky top-0 z-[1] -mx-1.5 flex h-6 items-end gap-2 bg-menu px-3.5 pb-0.5 text-[12px] font-medium leading-4 text-ink-tertiary"
            >
              <span className="min-w-0 flex-1 truncate">{section.label}</span>
              {section.count > 0 && <span className="shrink-0 tabular-nums" aria-hidden="true">{section.count}</span>}
            </div>
            {section.rows.map(({ command, index }) => (
              <button
                key={`${command.kind}:${command.id}`}
                id={`composer-slash-option-${index}`}
                data-command-index={index}
                type="button"
                role="option"
                aria-selected={index === highlight}
                tabIndex={-1}
                title={command.description ? `${command.label} — ${command.description}` : command.label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(command)}
                onMouseEnter={() => onHighlight(index)}
                className={cn(SIMPLE_MENU_ROW, "min-h-11", index === highlight && "bg-ink/[0.06]")}
              >
                <span className={MENU_GUTTER} aria-hidden="true">
                  {command.kind === "skill" ? <Sparkles size={16} className="text-ink-secondary" />
                    : command.id === "goal" ? <Target size={16} className="text-ink-secondary" />
                      : command.id === "learn" ? <BookOpen size={16} className="text-ink-secondary" />
                        : <Settings2 size={16} className="text-ink-secondary" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-medium leading-[18px] text-ink">{command.label}</span>
                  {command.description && <span className="truncate text-[12px] leading-4 text-ink-secondary">{command.description}</span>}
                </span>
              </button>
            ))}
          </div>
        ))}
        {!commands.length && (
          <div className="px-3 py-6 text-center text-[12px] leading-4 text-ink-secondary">
            <div>{t("composer.commands.noMatch", { query })}</div>
            <div className="mt-0.5 text-ink-tertiary">{t("composer.commands.noMatchHint")}</div>
          </div>
        )}
      </div>
      <div className="flex h-8 shrink-0 items-center justify-center border-t border-ink/10 px-3 text-[11px] leading-4 text-ink-tertiary">
        {t("composer.commands.keys")}
      </div>
    </div>
  );
}
