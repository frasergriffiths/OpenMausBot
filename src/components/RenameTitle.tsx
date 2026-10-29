import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

import { nextRename } from "@/lib/rename";
import { cn } from "@/lib/cn";
import { BOT_PROFILE_LIMITS } from "../../shared/bot-profile";

export function RenameTitle({
  value,
  onCommit,
  onEditingChange,
  editRequest = 0,
  title,
  className,
  inputClassName,
}: {
  value: string;
  onCommit: (next: string) => void;
  onEditingChange?: (editing: boolean) => void;
  editRequest?: number;
  title?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const handledRequest = useRef(editRequest);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const setMode = (next: boolean) => {
    setEditing(next);
    onEditingChange?.(next);
  };

  useEffect(() => {
    if (editRequest === handledRequest.current) return;
    handledRequest.current = editRequest;
    setDraft(value);
    setMode(true);
  }, [editRequest]);

  const finish = (save: boolean) => {
    const next = save ? nextRename(value, draft) : null;
    setMode(false);
    if (next) onCommit(next);
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        maxLength={BOT_PROFILE_LIMITS.name}
        aria-label={t("rename.aria")}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            finish(true);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finish(false);
          }
        }}
        className={cn("min-w-0 bg-transparent text-ink focus:outline-none", inputClassName)}
      />
    );
  }

  return <span className={className} title={title}>{value}</span>;
}
