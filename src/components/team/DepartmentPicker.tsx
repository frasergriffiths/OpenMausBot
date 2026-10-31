import { Select } from "@/components/ui";
import { t } from "@/lib/i18n";

/**
 * The one department switcher both department dialogs use: same label, same
 * control, same place, so instructions and memory read as one pair.
 */
export function DepartmentPicker({ value, sections, onChange, disabled = false }: {
  value: string;
  sections: ReadonlyArray<{ key: string; name: string }>;
  onChange: (key: string, name: string) => void;
  disabled?: boolean;
}) {
  // One department is not a choice; showing a picker with a single option is noise.
  if (sections.length < 2) return null;
  return (
    <label className="flex items-center justify-between gap-3 text-[13px] text-ink-secondary">
      <span>{t("settings.departments.title")}</span>
      <Select
        className="w-56"
        value={value}
        disabled={disabled}
        aria-label={t("settings.departments.title")}
        onChange={(event) => {
          const next = sections.find((entry) => entry.key === event.target.value);
          if (next) onChange(next.key, next.name);
        }}
      >
        {sections.map((entry) => (
          <option key={entry.key || "general"} value={entry.key}>{entry.name}</option>
        ))}
      </Select>
    </label>
  );
}
