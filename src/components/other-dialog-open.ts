import { useState } from "react";

import { useVisibleInterval } from "@/hooks/use-visible-interval";

const OTHER_DIALOGS = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [data-tour-card], [data-cloud-setup-ready]';
const UPDATES_CONSENT_POPUP = "[data-updates-consent-popup]";

/** Any dialog on screen counts, modal or not; never the notice queue's own cards. */
export function otherDialogOpen(): boolean {
  return [...document.querySelectorAll<HTMLElement>(OTHER_DIALOGS)]
    .some((element) => !element.closest(UPDATES_CONSENT_POPUP) && element.checkVisibility());
}

export function useOtherDialogOpen(watch: boolean): boolean {
  const [, setOpen] = useState(false);
  useVisibleInterval(() => setOpen(otherDialogOpen()), 1_000, watch);
  return watch && otherDialogOpen();
}

