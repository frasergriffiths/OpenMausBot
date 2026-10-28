import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { MausAvatar } from "./Avatar";
import { NewBotDialog } from "./lazy-screens";
import { READY_BOT_CATEGORIES, READY_BOTS, matchesReadyBot, type ReadyBotCategory } from "@/lib/ready-bots";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";
import { useStore, type Bot } from "@/state/store";

const APP_LABELS: Record<string, string> = {
  gmail: "Gmail", github: "GitHub", discord: "Discord", slack: "Slack", googlecalendar: "Google Calendar",
  notion: "Notion", linear: "Linear", figma: "Figma", gong: "Gong", hubspot: "HubSpot",
};

const CATEGORY_KEYS: Record<ReadyBotCategory, LocaleKey> = {
  everyday: "readyBots.category.everyday", work: "readyBots.category.work", writing: "readyBots.category.writing",
  design: "readyBots.category.design", sales: "readyBots.category.sales", personal: "readyBots.category.personal",
};

const PILL = "inline-flex h-7 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-medium leading-5 transition-colors";

export function ReadyBotGallery({ search, onDialog, onAdded }: {
  search: string;
  /** The New bot dialog is open over Templates, so Templates must leave its keys alone. */
  onDialog: (open: boolean) => void;
  onAdded: (bot: Bot) => void;
}) {
  const [category, setCategory] = useState<ReadyBotCategory | null>(null);
  const { dispatch } = useStore();
  const [adding, setAdding] = useState<string | null>(null);
  const open = (id: string | null) => {
    // A paired device may not read the host's New bot defaults that the review is filled from.
    if (id !== null && window.ogb?.remoteClient?.active) { dispatch({ type: "newBot", onCreated: onAdded }); return; }
    setAdding(id); onDialog(id !== null);
  };
  const visible = READY_BOTS.filter((bot) => (!category || bot.category === category) && matchesReadyBot(bot, search));
  if (search.trim() && visible.length === 0) return null;
  return <section aria-labelledby="ready-bots-title">
    <div className="mb-1.5 flex min-h-7 items-center justify-between gap-3 px-2">
      <h3 id="ready-bots-title" className="min-w-0 truncate text-[14px] font-semibold leading-5 text-ink">{t("readyBots.title")}</h3>
      <p className="hidden shrink-0 text-[12px] leading-4 text-ink-tertiary sm:block">{t("readyBots.subtitle")}</p>
    </div>
    <div className="mb-2 flex flex-wrap items-center gap-2 px-2" role="group" aria-label={t("readyBots.categories")}>
      {[null, ...READY_BOT_CATEGORIES].map((value) => <button key={value ?? "all"} type="button" aria-pressed={category === value}
        onClick={() => setCategory(value)}
        className={cn(PILL, category === value ? "bg-ink text-app" : "bg-control/70 text-ink-secondary hover:bg-raised-hover hover:text-ink")}>
        {value ? t(CATEGORY_KEYS[value]) : t("readyBots.all")}
      </button>)}
    </div>
    <div className="grid grid-cols-1 items-start gap-x-6 gap-y-1 @xl:grid-cols-2">
      {visible.map((bot) => <article key={bot.id} data-ready-bot={bot.id} className="flex min-w-0 flex-col rounded-xl px-2 py-2 transition-colors hover:bg-raised/40">
        <div className="flex items-center gap-3">
          <MausAvatar color={bot.look.color} bodyId={bot.look.mascotBody} size={40} animated={false} label={bot.name} />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-[14px] font-semibold leading-5 text-ink">{bot.name}</h4>
            <p className="truncate text-[13px] leading-[18px] text-ink-secondary">{bot.title} · {t(CATEGORY_KEYS[bot.category])}</p>
          </div>
          <button type="button" onClick={() => open(bot.id)} aria-label={t("readyBots.addAria", { name: bot.name, title: bot.title })}
            className="inline-flex h-7 min-w-[64px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-control/80 px-3 text-[13px] font-medium leading-5 text-ink transition-colors hover:bg-raised-hover focus-visible:outline-2 focus-visible:outline-accent">
            <Plus size={13} aria-hidden="true" />{t("readyBots.add")}
          </button>
        </div>
        <p className="mt-2 ps-[52px] text-[13px] leading-[18px] text-ink-secondary">{bot.description}</p>
        <p className="mt-1 ps-[52px] text-[12px] leading-4 italic text-ink-tertiary">{t("readyBots.try", { prompt: bot.tryAsking[0]! })}</p>
        {(bot.apps.length > 0 || bot.routines?.length) && <p className="mt-1 ps-[52px] text-[12px] leading-4 text-ink-tertiary">
          {[bot.apps.length > 0 && t("readyBots.worksWith", { apps: bot.apps.map((app) => APP_LABELS[app] ?? app).join(", ") }),
            bot.routines?.length && t("readyBots.pausedRoutine")].filter(Boolean).join(" · ")}
        </p>}
      </article>)}
    </div>
    {adding && createPortal(<NewBotDialog readyBotId={adding} onClose={() => open(null)} onCreated={(bot) => { onDialog(false); onAdded(bot); }} />, document.body)}
  </section>;
}
