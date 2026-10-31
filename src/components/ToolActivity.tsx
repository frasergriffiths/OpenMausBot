import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/state/store";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { placeLabelKey, type Place } from "@/lib/place";
import { toolStepLabel } from "@/lib/tool-step-label";
import { StatusDot, type StatusState } from "@/components/ui";
import { PlaceIcon } from "./PlaceIcon";

const FIELD_LABEL = "mb-1 text-[10.5px] font-medium uppercase tracking-[0.04em] text-ink-tertiary";

export function ToolActivity({ tool, place = null, live = false }: { tool: NonNullable<Message["tool"]>; place?: Place | null; live?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const failed = tool.ok === false;
  const state: StatusState = tool.ok === undefined ? (live ? "running" : "unknown") : failed ? "failed" : "done";
  const label = toolStepLabel(tool);
  const status = tool.ok === undefined ? (live ? t("toolDetail.running") : t("toolDetail.unverified")) : failed ? t("toolDetail.failed") : t("toolDetail.completed");
  return (
    <details
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      className="group/tool w-fit max-w-full rounded-lg text-[12.5px] open:w-[min(38rem,100%)] open:rounded-xl open:border-[0.5px] open:border-hairline/60 open:bg-panel open:shadow-sm"
      data-testid="tool-activity"
    >
      <summary
        role="button"
        aria-expanded={expanded}
        aria-label={t("toolDetail.label", { name: label, status })}
        className={cn(
          "flex min-h-7 cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-150 motion-reduce:transition-none",
          "hover:bg-ink/[0.05] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
          "open:rounded-b-none open:px-3 open:py-1.5 open:hover:bg-transparent",
          failed ? "text-danger" : "text-ink-secondary",
          "[&::-webkit-details-marker]:hidden",
        )}
      >
        <StatusDot state={state} label={status} />
        {place && <PlaceIcon place={place} size={13} className="shrink-0 opacity-60" role="img" aria-label={t(placeLabelKey(place))} data-testid="tool-place" />}
        <span className="min-w-0 max-w-[30rem] truncate leading-5 font-medium">{label}</span>
        <ChevronRight
          size={12}
          className="ml-auto shrink-0 text-ink-tertiary opacity-0 transition-[opacity,transform] duration-150 group-hover/tool:opacity-100 group-open/tool:rotate-90 group-open/tool:opacity-100 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-3 border-t border-hairline/50 px-3 py-2.5 text-ink-secondary">
        <div className={cn("text-[11px] font-medium", failed && "text-danger")}>{status}</div>
        {label !== tool.name && <div>
          <div className={FIELD_LABEL}>{t("toolDetail.tool")}</div>
          <p dir="ltr" className="break-words font-mono text-[11.5px] text-ink" data-testid="tool-name">{tool.name}</p>
        </div>}
        <div>
          <div className={FIELD_LABEL}>{t("toolDetail.input")}</div>
          <pre dir="ltr" className="max-h-52 overflow-auto rounded-lg bg-inset p-2.5 font-mono text-[11.5px] whitespace-pre-wrap break-words text-ink">{tool.input ?? tool.summary ?? tool.name}</pre>
        </div>
        <div>
          <div className={FIELD_LABEL}>{t("toolDetail.output")}</div>
          {tool.output ? <pre dir="ltr" className="max-h-64 overflow-auto rounded-lg bg-inset p-2.5 font-mono text-[11.5px] whitespace-pre-wrap break-words text-ink">{tool.output}</pre> : <p className="text-xs">{tool.ok === undefined ? (live ? t("toolDetail.waiting") : t("toolDetail.unverified")) : t("toolDetail.noOutput")}</p>}
        </div>
        <p className="text-[11px] text-ink-tertiary">{t("toolDetail.previewHint")}</p>
      </div>
    </details>
  );
}
