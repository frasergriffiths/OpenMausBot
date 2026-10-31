import { Check, Copy, X } from "lucide-react";

import { t } from "@/lib/i18n";
import { useCopyFeedback } from "@/lib/copy-text";

/** A link with a copy button: a guest link, a pairing link, a share link. */
export function CopyLink({ link }: { link: string }) {
  const { state, copy } = useCopyFeedback(link);
  return (
    <div className="mt-3 rounded-lg border border-hairline/40 bg-inset p-3 text-[13px]">
      <div className="mb-1 text-ink-secondary">{t("people.link")}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 select-all break-all text-ink">{link}</code>
        <button type="button" onClick={copy} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] text-ink-secondary hover:bg-control hover:text-ink">
          {state === "copied" ? <Check size={13} className="text-success" /> : state === "failed" ? <X size={13} className="text-danger" /> : <Copy size={13} />}
          {t(state === "copied" ? "people.copied" : state === "failed" ? "common.copyFailed" : "people.copy")}
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">{t("people.linkHint")}</p>
    </div>
  );
}

