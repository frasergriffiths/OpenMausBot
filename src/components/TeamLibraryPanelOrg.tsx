import { Building2, Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import {
  orgCardAction,
  orgCardNotes,
  orgContentsLine,
  orgModeBadge,
  orgPublisherLine,
  type OrgLibraryListing,
  type OrgLibraryPackage,
} from "@/lib/org-library";

const GLYPHS = [
  "bg-cyan-500/15 text-cyan-300",
  "bg-purple-500/15 text-purple-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-orange-500/15 text-orange-300",
] as const;

const ACTION = "inline-flex h-7 min-w-[64px] shrink-0 items-center justify-center gap-2 rounded-full bg-control/80 px-3 text-[13px] font-medium leading-5 text-ink transition-colors hover:bg-raised-hover disabled:opacity-40";

export function OrgLibraryTab({
  listing,
  busy,
  notice,
  error,
  search,
  onAdd,
  onDetails,
}: {
  listing: OrgLibraryListing & { organization: { id: string; name: string } };
  busy: string | null;
  notice: string;
  error: string;
  /** The Templates search field: a name or tagline match, lowercased. */
  search: string;
  onAdd: (entry: OrgLibraryPackage) => void;
  onDetails: (entry: OrgLibraryPackage) => void;
}) {
  const name = listing.organization.name;
  const visible = listing.packages.filter((entry) => !search || `${entry.name} ${entry.tagline}`.toLowerCase().includes(search));
  return (
    <div>
      <p className="max-w-2xl px-2 text-[13px] leading-[18px] text-ink-secondary">{t("orgLibrary.intro", { name })}</p>
      {listing.packages.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center text-center">
          <div className="text-[14px] font-medium text-ink">{t("orgLibrary.empty", { name })}</div>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center text-center">
          <div className="text-[14px] font-medium text-ink">{t("templates.noneFound")}</div>
          <div className="mt-1 text-[13px] text-ink-secondary">{t("templates.tryDifferentSearch")}</div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 items-start gap-x-6 gap-y-1 @xl:grid-cols-2 md:grid-cols-2">
          {visible.map((entry, index) => (
            <OrgPackageCard key={entry.packageId} entry={entry} index={index} busy={busy} onAdd={onAdd} onDetails={onDetails} />
          ))}
        </div>
      )}
      {notice && <div role="status" className="mt-3 rounded-xl bg-control/50 px-3 py-2 text-[12px] text-ink-secondary">{notice}</div>}
      {error && <div role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-[12px] text-danger">{error}</div>}
    </div>
  );
}

function OrgPackageCard({
  entry,
  index,
  busy,
  onAdd,
  onDetails,
}: {
  entry: OrgLibraryPackage;
  index: number;
  busy: string | null;
  onAdd: (entry: OrgLibraryPackage) => void;
  onDetails: (entry: OrgLibraryPackage) => void;
}) {
  const action = orgCardAction(entry);
  const badge = orgModeBadge(entry);
  const notes = orgCardNotes(entry);
  const adding = busy === entry.packageId;
  return (
    <article className="flex min-w-0 flex-col rounded-xl px-2 py-2 transition-colors hover:bg-raised/40">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", GLYPHS[index % GLYPHS.length])}>
          <Building2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold leading-5 text-ink">{entry.name}</h3>
          <p className="truncate text-[13px] leading-[18px] text-ink-secondary">{entry.tagline}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-ink-tertiary">
            <span>{orgPublisherLine(entry)}</span>
            {badge && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent-text">{badge}</span>}
            {entry.release && <span>{entry.release.version}</span>}
          </p>
          <p className="truncate text-[12px] leading-4 text-ink-tertiary">{orgContentsLine(entry.contents)}</p>
          {notes.map((note) => <p key={note} className="text-[12px] leading-4 text-warning">{note}</p>)}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {action === "add" && (
            <button
              type="button"
              onClick={() => onAdd(entry)}
              disabled={busy !== null}
              aria-label={t("orgLibrary.addAria", { name: entry.name })}
              className={cn(ACTION, "bg-accent text-white hover:bg-accent/90")}
            >
              {adding && <Loader2 size={13} className="animate-spin" />}
              {adding ? t("orgLibrary.adding") : t("orgLibrary.add")}
            </button>
          )}
          {action === "added" && (
            <span className="flex h-7 items-center gap-1 rounded-full bg-raised px-3 text-[13px] text-ink-secondary">
              <Check size={13} className="text-success" />{t("orgLibrary.added")}
            </span>
          )}
          {action === "updateApp" && <span className="max-w-[140px] text-right text-[12px] leading-4 text-ink-secondary">{t("orgLibrary.updateApp")}</span>}
          {action === "notReady" && <span className="text-[12px] leading-4 text-ink-secondary">{t("orgLibrary.notReady")}</span>}
          {action === "noRelease" && <span className="text-[12px] leading-4 text-ink-secondary">{t("orgLibrary.noRelease")}</span>}
          {entry.blob === "ready" && (
            <button
              type="button"
              onClick={() => onDetails(entry)}
              disabled={busy !== null}
              aria-label={t("orgLibrary.detailsAria", { name: entry.name })}
              className="shrink-0 rounded-full px-2 text-[13px] font-medium leading-5 text-ink-secondary transition-colors hover:text-ink disabled:opacity-40"
            >
              {t("orgLibrary.details")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
