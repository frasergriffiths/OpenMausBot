import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/state/store";
import { t } from "@/lib/i18n";
import { Button, Callout, Dialog, Select, Spinner } from "@/components/ui";

interface SectionContextResponse {
  section: string;
  label: string;
  text: string;
  updatedAt: number | null;
  maxBytes: number;
}

export interface DepartmentsPicker {
  sections: ReadonlyArray<{ key: string; name: string }>;
  onPick: (key: string, name: string) => void;
}

/** The department's shared instructions, in the same dialog every other screen uses. */
export function SectionContextDialog({ section, label, onClose, picker }: {
  section: string;
  label: string;
  onClose: () => void;
  picker?: DepartmentsPicker;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [maxBytes, setMaxBytes] = useState(24_000);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = text !== savedText;
  const bytes = useMemo(() => new TextEncoder().encode(text).byteLength, [text]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api(`/api/section-context?section=${encodeURIComponent(section)}`)
      .then((result: SectionContextResponse) => {
        if (cancelled) return;
        setText(result.text);
        setSavedText(result.text);
        setUpdatedAt(result.updatedAt);
        setMaxBytes(result.maxBytes);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [section]);

  const save = async () => {
    if (bytes > maxBytes) return;
    setSaving(true);
    setError(null);
    try {
      const result: SectionContextResponse = await api(
        `/api/section-context?section=${encodeURIComponent(section)}`,
        { method: "PUT", body: JSON.stringify({ text }) },
      );
      setSavedText(result.text);
      setText(result.text);
      setUpdatedAt(result.updatedAt);
      setMaxBytes(result.maxBytes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const close = useCallback(() => {
    if (saving) return;
    if (dirty && !window.confirm(t("team.instructionsDiscard"))) return;
    onClose();
  }, [dirty, saving, onClose]);

  return (
    <Dialog
      open
      onClose={close}
      size="lg"
      title={t("team.instructionsTitle", { name: label })}
      description={t("team.instructionsHint")}
      closeLabel={t("team.instructionsClose")}
      footer={
        <>
          <Button size="sm" type="button" onClick={close} disabled={saving}>{t("common.cancel")}</Button>
          <Button size="sm" variant="primary" type="button" onClick={() => void save()} disabled={loading || saving || !dirty || bytes > maxBytes}>
            {saving ? t("team.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {picker && picker.sections.length > 1 && (
          <label className="flex items-center gap-2 text-[13px] text-ink-secondary">
            {t("settings.departments.title")}
            <Select
              value={section}
              aria-label={t("settings.departments.title")}
              onChange={(event) => {
                const next = picker.sections.find((entry) => entry.key === event.target.value);
                if (next && !(dirty && !window.confirm(t("team.instructionsDiscard")))) picker.onPick(next.key, next.name);
              }}
            >
              {picker.sections.map((entry) => (
                <option key={entry.key || "general"} value={entry.key}>{entry.name}</option>
              ))}
            </Select>
          </label>
        )}
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center"><Spinner label={t("team.instructionsLoading")} /></div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("team.instructionsPlaceholder")}
              aria-label={t("team.instructionsTitle", { name: label })}
              className="min-h-[240px] w-full resize-y rounded-xl bg-ink/[0.04] px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-tertiary focus:ring-1 focus:ring-focus"
            />
            <div className="flex items-start justify-between gap-4 text-[12px] text-ink-secondary">
              <span>
                {t("team.instructionsFactHint")} {updatedAt ? ` ${t("team.instructionsLastSaved", { time: new Date(updatedAt).toLocaleString() })}` : ""}
              </span>
              <span className={bytes > maxBytes ? "shrink-0 tabular-nums text-danger" : "shrink-0 tabular-nums"}>
                {bytes.toLocaleString()} / {maxBytes.toLocaleString()} bytes
              </span>
            </div>
          </>
        )}
        {error && <Callout tone="danger" role="alert">{error}</Callout>}
      </div>
    </Dialog>
  );
}

