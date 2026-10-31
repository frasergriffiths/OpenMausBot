import type { ReactNode } from "react";
import { Check, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { IconButton } from "./button";

export type ToastTone = "info" | "success" | "danger";

export interface ToastMessage {
  id: string;
  text: ReactNode;
  tone?: ToastTone;
}

export function ToastRegion({ messages, onDismiss, label }: { messages: ToastMessage[]; onDismiss: (id: string) => void; label: string }) {
  return (
    <div role="region" aria-label={label} aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-3">
      {messages.map((message) => {
        const tone = message.tone ?? "info";
        const Icon = tone === "success" ? Check : tone === "danger" ? TriangleAlert : Info;
        return (
          <div
            key={message.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-xl border-[0.5px] px-3 py-2 shadow-xl backdrop-blur",
              "animate-rise motion-reduce:animate-none",
              tone === "success" && "border-success/30 bg-menu text-ink",
              tone === "danger" && "border-danger/30 bg-menu text-ink",
              tone === "info" && "border-hairline bg-menu text-ink",
            )}
          >
            <Icon size={15} aria-hidden="true" className={cn("shrink-0", tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink-secondary")} />
            <div className="min-w-0 flex-1 text-[13px]">{message.text}</div>
            <IconButton label="Dismiss" size="sm" onClick={() => onDismiss(message.id)}>
              <X size={13} />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
