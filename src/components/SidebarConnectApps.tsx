import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { dismissConnectAppsPill, useConnectAppsPillDismissed } from "@/lib/connect-apps-pill";
import { everyAppConnected, everyCatalogueAppConnected } from "@/lib/connector-status";
import { t } from "@/lib/i18n";
import { loadNativeAppConnections } from "@/lib/native-app-connections";
import { useStore } from "@/state/store";

import { loadAppCatalogue } from "./bot-settings/useBotApps";
import { preloadConnectedApps, type ToolkitCard } from "./PluginsPanel";

export type AppFace = Pick<ToolkitCard, "slug" | "label" | "logo" | "domain">;

export const POPULAR_APPS: readonly AppFace[] = [
  { slug: "gmail", label: "Gmail", logo: null, domain: "gmail.com" },
  { slug: "slack", label: "Slack", logo: null, domain: "slack.com" },
  { slug: "notion", label: "Notion", logo: null, domain: "notion.so" },
];

export const APP_FACES = 3;

export function appFaces(connected: readonly string[], cards: ReadonlyMap<string, AppFace>): AppFace[] {
  const own = connected.map((slug) => cards.get(slug)).filter((card): card is AppFace => Boolean(card));
  return [...own, ...POPULAR_APPS.filter((app) => !own.some((card) => card.slug === app.slug))].slice(0, APP_FACES);
}

/** `null` until the first inventory and catalogue answer arrive: the row starts hidden so a fully connected sidebar
 *  never paints it for a frame and then snatches it away. */
function useAppFaces(): { faces: AppFace[]; nothingToConnect: boolean } | null {
  const { state } = useStore();
  const [result, setResult] = useState<{ faces: AppFace[]; nothingToConnect: boolean } | null>(null);
  useEffect(() => {
    if (state.pluginsOpen) return;
    let alive = true;
    void Promise.all([preloadConnectedApps(true), loadAppCatalogue()])
      .then(async ([inventory, catalogue]) => {
        const connected = Object.entries(inventory.services).filter(([, status]) => status.connected).map(([slug]) => slug).sort();
        const cards = connected.length > 0 ? catalogue.cards : new Map<string, AppFace>();
        // An unread or empty catalogue must keep the row: the other direction hides a real connection.
        const slugs = catalogue.complete ? catalogue.slugs : null;
        const catalogueDone = everyCatalogueAppConnected(inventory.services, inventory.authoritative, slugs);
        const native = catalogueDone ? await loadNativeAppConnections() : [];
        if (alive) {
          setResult({
            faces: appFaces(connected, cards),
            nothingToConnect: everyAppConnected(inventory.services, inventory.authoritative, slugs, native),
          });
        }
      })
      .catch(() => {
        if (alive) setResult({ faces: appFaces([], new Map()), nothingToConnect: false });
      });
    return () => { alive = false; };
  }, [state.pluginsOpen]);
  return result;
}

function AppFaceIcon({ face, className }: { face: AppFace; className?: string }) {
  const sources = [face.logo, face.domain ? `https://www.google.com/s2/favicons?domain=${face.domain}&sz=64` : null].filter((src): src is string => Boolean(src));
  const [failed, setFailed] = useState(0);
  const src = sources[failed];
  return (
    <span data-app-face={face.slug} className={cn("flex size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-px ring-[1.5px] ring-composer", className)}>
      {src
        ? <img src={src} alt="" draggable={false} className="size-4 object-contain" onError={() => setFailed((count) => count + 1)} />
        : <span className="text-[10px] font-semibold leading-none text-neutral-700">{face.label.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

/** The three faces fan out while the row is hovered. */
const FAN = ["motion-safe:group-hover/apps:-translate-x-[3px] motion-safe:group-hover/apps:-rotate-[8deg]", "", "motion-safe:group-hover/apps:translate-x-[3px] motion-safe:group-hover/apps:rotate-[8deg]"];

/** The connect-apps prompt: its own full-width row above the footer's icon cluster. The footer's Apps squircle is the
 *  permanent entry, so this is only the ask, never a replacement control. */
export function ConnectAppsPromptRow({ faces, open, onOpen, onDismiss }: {
  faces: readonly AppFace[];
  open: boolean;
  onOpen: () => void;
  onDismiss?: () => void;
}) {
  const label = t("sidebar.connectApps");
  return (
    <div data-connect-apps-pill className="group/apps flex h-9 w-full items-center gap-2 rounded-full bg-menu ps-3 pe-1 ring-1 ring-hairline">
      <button
        type="button"
        data-connect-apps-open
        aria-pressed={open}
        onClick={onOpen}
        className="flex h-full min-w-0 flex-1 items-center gap-2 text-left text-[14px] font-medium leading-5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="min-w-0 truncate">{label}</span>
        <span aria-hidden="true" className="ms-auto flex shrink-0 items-center">
          {faces.map((face, index) => <AppFaceIcon key={face.slug} face={face}
            className={cn(index > 0 && "-ms-1.5", faces.length > 1 && FAN[index === 0 ? 0 : index === faces.length - 1 ? 2 : 1], "motion-safe:transition-transform motion-safe:duration-150")} />)}
        </span>
      </button>
      {onDismiss && (
        <button
          type="button"
          data-connect-apps-dismiss
          aria-label={t("sidebar.hideConnectApps")}
          title={t("sidebar.hideConnectApps")}
          onClick={onDismiss}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-ink-tertiary transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={12} strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** Simple mode's prompt. A dismissal hides only this row; the footer's Apps squircle stays. */
export function SidebarConnectApps() {
  const { state, dispatch } = useStore();
  const dismissed = useConnectAppsPillDismissed();
  const result = useAppFaces();
  if (dismissed || result?.nothingToConnect) return null;
  // The panel is its own way back, so keep the row while it is open even before the inventory answers.
  if (!result && !state.pluginsOpen) return null;
  const openPanel = () => dispatch({ type: "togglePlugins", open: true });
  const dismiss = () => {
    dismissConnectAppsPill();
    // The row is removed by the dismissal: land on the footer's permanent Apps entry, never on <body>.
    setTimeout(() => document.querySelector<HTMLElement>('[data-sidebar-footer="simple"] [data-sidebar-nav="apps"]')?.focus(), 0);
  };
  return <ConnectAppsPromptRow faces={result?.faces ?? appFaces([], new Map())} open={state.pluginsOpen} onOpen={openPanel} onDismiss={dismiss} />;
}
