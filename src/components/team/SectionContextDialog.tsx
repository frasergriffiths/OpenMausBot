import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/state/store";
import { t } from "@/lib/i18n";
import { Button, Callout, Dialog, Spinner, Textarea } from "@/components/ui";
import { DepartmentPicker } from "./DepartmentPicker";

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
      size="md"
      title={t("team.instructionsTitle", { name: label })}
      description={t("team.instructionsHint")}
      closeLabel={t("team.instructionsClose")}
      footer={
        <>
          <Button variant="ghost" size="sm" type="button" onClick={close} disabled={saving}>{t("common.cancel")}</Button>
          <Button variant="primary" size="sm" type="button" onClick={() => void save()} disabled={loading || saving || !dirty || bytes > maxBytes} loading={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <DepartmentPicker
          value={section}
          sections={picker?.sections ?? []}
          disabled={saving}
          onChange={(key, name) => {
            if (dirty && !window.confirm(t("team.instructionsDiscard"))) return;
            picker?.onPick(key, name);
          }}
        />
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center"><Spinner label={t("team.instructionsLoading")} /></div>
        ) : (
          <>
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("team.instructionsPlaceholder")}
              aria-label={t("team.instructionsTitle", { name: label })}
              className="min-h-[240px] font-mono leading-relaxed"
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

