import { Info, RefreshCw } from "lucide-react";
import { statusActivity } from "@/lib/activity-runs";
import type { Message } from "@/state/store";
import { cn } from "@/lib/cn";
import { CancelledTurnRow } from "./CancelledTurnRow";
import { FirstReplyRescueRow } from "./FirstReplyRescueRow";

export function StatusActivityRow({ message }: { message: Message }) {
  const status = statusActivity(message);
  if (!status) return null;
  if (status.kind === "stopped") return <CancelledTurnRow name={message.tool?.name} />;
  if (message.tool?.rescue) return <FirstReplyRescueRow rescue={message.tool.rescue} text={status.text} at={message.at} />;
  const Icon = status.kind === "recovery" ? RefreshCw : Info;
  return (
    <div role="status" className={cn("flex w-fit max-w-full items-start gap-2 rounded-lg px-1.5 py-1 text-[12.5px] text-ink-secondary", "transition-colors duration-150 motion-reduce:transition-none")}>
      <Icon size={12} aria-hidden="true" className="mt-[3px] shrink-0 text-ink-tertiary" />
      <span className="min-w-0 break-words leading-5">{status.text}</span>
    </div>
  );
}
