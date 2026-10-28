import { ArrowLeft, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { routineDateTime, routineRunLabel, routineRunTone } from "@/lib/routine-display";
import { useStore } from "@/state/store";

/** A routine's past runs, read-only. Runs are the bot's record; the app never edits or starts them from here. */
export function RoutineRunsPage({ onBack }: { onBack: () => void }) {
  const { state } = useStore();
  const focus = state.routinesFocus;
  const routine = state.routines.find((entry) => entry.id === focus.routineId);
  const runs = state.routineRuns
    .filter((run) => (focus.routineId ? run.routineId === focus.routineId : !focus.botId || run.botId === focus.botId))
    .sort((a, b) => (b.scheduledFor ?? b.startedAt ?? 0) - (a.scheduledFor ?? a.startedAt ?? 0));

  return (
    <main className="relative flex h-full min-w-0 flex-1 flex-col bg-app">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline/40 px-4">
        <button type="button" onClick={onBack} aria-label={t("common.back")} className="flex size-8 items-center justify-center rounded-md text-ink-secondary hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
          {routine ? t("routines.drawer.allRuns") : t("routines.logs")}
        </h1>
        {routine && <span className="min-w-0 max-w-[45%] truncate text-[13px] text-ink-secondary">{routine.name}</span>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline/50 p-5 text-center text-[13px] text-ink-secondary">
            <FileText size={20} className="mx-auto mb-2 opacity-60" aria-hidden="true" />
            {t("routines.neverRun")}
          </div>
        ) : (
          <ul className="space-y-2" aria-label={t("routines.logs")}>
            {runs.map((run) => (
              <li key={run.id} className="rounded-xl border border-hairline/40 bg-card px-3.5 py-3">
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-[13px] font-medium", routineRunTone(run))}>{routineRunLabel(run)}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-secondary">
                    {routineDateTime(run.finishedAt ?? run.startedAt ?? run.scheduledFor)}
                  </span>
                </div>
                {run.error && <p className="mt-1 text-[12px] leading-relaxed text-danger">{run.error}</p>}
                {!run.error && run.output && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[12px] leading-relaxed text-ink-secondary">{run.output}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
