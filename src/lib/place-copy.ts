import type { PlaceView } from "../../shared/place-view";
import type { EffectivePlace } from "@/lib/place";
import { t } from "@/lib/i18n";
import { placeBlocked } from "@/lib/place-view";
import { worksOnSimpleLabel } from "@/lib/place-view";
import type { Bot } from "@/state/store";

/** The six choices a person can make. Order follows the create step: automatic, then the three places, then the
 *  extras that only exist for a bot that already had them. */
export const PLACE_ORDER: readonly EffectivePlace[] = ["auto", "local", "browser", "cloud", "vm", "off"];

export interface PlaceCopy {
  /** The platform-aware name ("This Mac", "This PC"), from the one label table. */
  name: string;
  /** Whether it works now, in one short phrase; empty for Automatic and No computer. */
  state: string;
  /** What the bot can do there, verb first, never repeating the name. */
  line: string;
  /** What must be true first, or what it costs; empty when there is nothing to say. */
  needs: string;
  /** Warning tone only when the needs line blocks the choice. */
  blocked: boolean;
}

const FALLBACK_LINE: Partial<Record<EffectivePlace, string>> = {
  auto: "place.view.auto.lineDesktop",
  off: "place.view.off.line",
};

/** One place's four layers, derived from the view the product already computes. */
export function placeCopy(value: EffectivePlace, view: PlaceView | undefined, platform: DesktopCapabilities["host"]["platform"]): PlaceCopy {
  const blocked = value === "local" ? view?.state === "local-unavailable" : value === "browser" ? view?.state === "browser-off" || view?.state === "browser-cannot" : view ? placeBlocked(view) : false;
  let needs = "";
  if (value === "local" && blocked) needs = t("place.needs.local");
  else if (value === "cloud" && view && (view.state === "cc-cannot" || view.state === "cc-unavailable")) needs = t("place.needs.cloudNone");
  else if (value === "cloud" && view) needs = t("place.needs.cloud");
  else if (value === "vm" && blocked) needs = t("place.needs.vm");
  else if (value === "browser" && blocked) needs = t("place.needs.browser");
  else if (value === "auto") needs = t("place.needs.cloud");
  const line = view?.line
    ?? (FALLBACK_LINE[value] ? t(FALLBACK_LINE[value] as Parameters<typeof t>[0]) : "");
  return {
    name: worksOnSimpleLabel(value as Bot["computer"], platform),
    state: value === "auto" || value === "off" ? "" : view && !placeBlocked(view) && view.state !== "browser-off" && view.state !== "local-unavailable" ? t("place.state.ready") : (view?.short ?? ""),
    line,
    needs,
    blocked,
  };
}
