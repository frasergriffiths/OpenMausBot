import { useMemo, useState } from "react";
import { Keyboard, Search } from "lucide-react";

import {
  filterShortcutGroups,
  isMacPlatform,
  shortcutGroupsFor,
  shortcutKeysForPlatform,
  type ShortcutItem,
} from "@/lib/keyboard-shortcuts";
import { useSendKey } from "@/lib/send-key";
import { Dialog } from "@/components/ui";

export interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

function ShortcutRow({ item, isMac }: { item: ShortcutItem; isMac: boolean }) {
  const keys = shortcutKeysForPlatform(item, isMac);

  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-[13px] text-ink">{item.description}</span>
      <div className="flex shrink-0 items-center gap-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="inline-flex min-w-[22px] items-center justify-center rounded-md bg-control px-1.5 py-0.5 font-mono text-[12px] font-semibold text-ink"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const [query, setQuery] = useState("");
  const isMac = isMacPlatform();
  const sendKey = useSendKey();
  const groups = useMemo(() => filterShortcutGroups(shortcutGroupsFor(sendKey), query, isMac), [sendKey, query, isMac]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Keyboard size={16} aria-hidden="true" className="text-ink-secondary" />
          Keyboard shortcuts
        </span>
      }
      description="Quick commands and navigation"
      closeLabel="Close keyboard shortcuts"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-full bg-ink/[0.045] px-3 py-1.5 focus-within:ring-1 focus-within:ring-focus">
          <Search size={14} className="shrink-0 text-ink-secondary" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shortcuts…"
            aria-label="Search shortcuts"
            className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-secondary focus:outline-none"
          />
        </div>

        {groups.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-ink-secondary">No shortcuts found for “{query}”</div>
        ) : (
          <div className="flex max-h-[52vh] flex-col gap-4 overflow-y-auto pe-1">
            {groups.map((group) => (
              <section key={group.category} className="flex flex-col gap-1">
                <h3 className="text-[11px] font-semibold tracking-wider text-ink-tertiary">{group.category}</h3>
                <div className="flex flex-col divide-y divide-hairline/20 rounded-xl bg-ink/[0.03] px-3 py-1">
                  {group.items.map((item) => (
                    <ShortcutRow key={item.id} item={item} isMac={isMac} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="text-[12px] text-ink-secondary">
          Press <kbd className="rounded bg-control px-1 py-0.5 font-mono text-[11px]">?</kbd> when not typing to open
        </p>
      </div>
    </Dialog>
  );
}

