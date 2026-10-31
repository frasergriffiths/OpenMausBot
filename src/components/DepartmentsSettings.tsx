import { useMemo, useState } from "react";
import { Brain, ChevronRight, FileText } from "lucide-react";

import { buildTeamMapSections } from "@/lib/team-map";
import { t } from "@/lib/i18n";
import { useStore } from "@/state/store";
import { SettingRow, SettingsRows } from "@/components/ui";
import { SectionContextDialog } from "./team/SectionContextDialog";
import { TeamMemoryDialog } from "./TeamMemoryDialog";

/** Every department's shared instructions and memory, in Settings now that the Team map is gone. */
export function DepartmentsSettings() {
  const { state } = useStore();
  const [editing, setEditing] = useState<{ kind: "instructions" | "memory"; key: string; label: string } | null>(null);
  const sections = useMemo(() => {
    const bots = state.bots.filter((bot) => !bot.hidden);
    const names = [...new Set([...(state.sections ?? []), ...(state.groups ?? []).flatMap((group) => group.section ? [group.section] : [])])];
    return buildTeamMapSections(bots, names);
  }, [state.bots, state.sections, state.groups]);

  if (sections.length === 0) return null;
  const action = "flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12px] text-ink-secondary transition-colors hover:bg-ink/[0.06] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus motion-reduce:transition-none";

  return (
    <>
      <SettingsRows>
        {sections.map((section) => (
          <SettingRow key={section.key || "general"} title={section.name} subtitle={t("settings.departments.subtitle")}>
            <div className="flex items-center gap-1">
              <button type="button" className={action} onClick={() => setEditing({ kind: "instructions", key: section.key, label: section.name })}>
                <FileText size={13} aria-hidden="true" />
                {t("botSettings.simple.instructions")}
              </button>
              <button type="button" className={action} onClick={() => setEditing({ kind: "memory", key: section.key, label: section.name })}>
                <Brain size={13} aria-hidden="true" />
                {t("canvas.departmentMemory")}
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            </div>
          </SettingRow>
        ))}
      </SettingsRows>
      {editing?.kind === "instructions" && (
        <SectionContextDialog section={editing.key} label={editing.label} onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "memory" && (
        <TeamMemoryDialog key={editing.key} section={editing.key} label={editing.label} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

