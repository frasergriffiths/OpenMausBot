import { Undo2, Zap } from "lucide-react";

import { automationFor, automationSentence, automationStatus, capital, cardAutomation, firstRunLine, lastWhen, nextWhen, runLine } from "@/lib/automations";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { useStore, type OptionCardData } from "@/state/store";
import { appWaitingLine } from "@/lib/app-automations";
import { useAppTriggers } from "@/lib/app-triggers";

/** What a chat-made automation leaves in the conversation: one sentence, what happens next or what happened last. */
export function TriggerCard({ card }: { card: OptionCardData }) {
  const { state } = useStore();
  const appTriggers = useAppTriggers();
  const ref = cardAutomation(card);
  if (!ref) return null;
  const automation = automationFor(ref, { routines: state.routines, webhooks: state.webhooks, appTriggers: appTriggers.triggers, runs: state.routineRuns, bots: state.bots });
  const fallbackName = card.routineRequest?.undo?.name ?? card.webhookRequest?.undo?.name ?? card.appTriggerRequest?.undo?.name ?? card.title;

  if (card.undone || !automation) {
    if (!card.undone && ref.kind === "schedule" && state.routinesLoadState === "loading") return null;
    if (!card.undone && ref.kind === "app" && !appTriggers.loaded) return null;
    return (
      <div data-trigger-card={ref.id} className="flex w-full max-w-[840px] items-center gap-2 text-[13px] text-ink-tertiary">
        {card.undone ? <Undo2 size={13} /> : <Zap size={13} />}
        <span>{card.undone ? t("automations.card.removed") : `${t("automations.card.gone")} · ${fallbackName}`}</span>
      </div>
    );
  }

  const botName = state.bots.find((bot) => bot.id === automation.botId)?.name ?? t("routines.unavailableBot");
  const sentence = automationSentence(automation, botName);
  const status = automationStatus(automation);
  const last = automation.runs.find((run) => run.status !== "queued");
  const next = automation.nextRunAt != null ? nextWhen(automation.nextRunAt) : null;
  const lastRan = last && `${t("automations.card.lastRan", { when: lastWhen(last.startedAt ?? last.scheduledFor) })} ${runLine(last).mark} ${runLine(last).text}`;
  let line: string;
  if (status.state === "paused") line = t("automations.status.paused");
  else if (status.state === "done") line = [t("automations.status.done"), lastRan].filter(Boolean).join(" · ");
  else if (status.state === "needs-you") line = t("automations.needsYou", { reason: status.reason ?? "" });
  else if (lastRan) line = [lastRan, next && t("automations.next", { when: next })].filter(Boolean).join(" · ");
  else line = firstRunLine(automation) ?? (next ? t("automations.card.next", { when: next }) : automation.appTrigger ? appWaitingLine(automation.appTrigger) : capital(t("automations.notRunYet")));
  return (
    <section data-trigger-card={automation.id} data-automation-status={status.state} aria-label={sentence} className="w-full max-w-[640px] rounded-xl border border-hairline/45 bg-card px-3.5 py-2.5 text-[13px]">
      <div className="flex items-start gap-2">
        <Zap size={14} className={cn("mt-0.5 shrink-0", status.state === "needs-you" ? "text-warning" : automation.enabled ? "text-accent" : "text-ink-tertiary")} />
        <span className="min-w-0 font-medium leading-snug text-ink">{t("automations.card.setUp", { sentence })}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[22px] text-[12px]">
        <span className={cn("min-w-0 flex-1 basis-48 truncate", status.state === "needs-you" ? "text-warning" : "text-ink-secondary")} title={line}>{line}</span>
      </div>
    </section>
  );
}
