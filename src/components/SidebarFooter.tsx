import { cn } from "@/lib/cn";
import type { SidebarDensity } from "@/lib/sidebar-preferences";
import { useStore } from "@/state/store";

import { CloudUsageCard } from "./CloudUsageMeter";
import { endCloudHowTo, useWorkspacePlace, type WorkspacePlace } from "./DesktopWorkspaceSwitcher";
import { SidebarConnectApps } from "./SidebarConnectApps";
import { SidebarBottomButtons, SidebarFooterNav, SidebarTeamMapButton, SidebarTemplatesButton } from "./SidebarFooterNav";
import { phoneSettingsAction, SidebarPhoneButton } from "./SidebarPhoneButton";
import { SidebarProfileMenu, useSimpleAccount, type ArchivedBots } from "./SidebarProfileMenu";
import { UpdateIndicator } from "./UpdateIndicator";

export function useSimplePlace(): WorkspacePlace {
  const { state, dispatch } = useStore();
  return useWorkspacePlace({ cloudHome: state.config?.cloudHome === true, howTo: state.cloudHowTo, onMenuClosed: () => endCloudHowTo(dispatch) });
}

export function SidebarPlaceStatus({ place, className }: { place: WorkspacePlace; className?: string }) {
  if (place.error) return <p role="alert" className={cn("text-[12px] text-danger", className)}>{place.error}</p>;
  if (place.waking) return <p role="status" data-cloud-waking className={cn("text-[12px] text-ink-secondary", className)}>{place.waking}</p>;
  return null;
}

export interface FooterPlaceButtons {
  teamMapOpen: boolean;
  onOpenTeamMap: () => void;
  templatesOpen: boolean;
  onOpenTemplates: () => void;
}

function SimpleSidebarFooter({ owner, archived, places }: { owner: string | null; archived?: ArchivedBots; places: FooterPlaceButtons }) {
  const place = useSimplePlace();
  const account = useSimpleAccount(place, owner, archived);
  return (
    <div data-sidebar-footer="simple" className="px-4 pb-4 pt-2">
      <CloudUsageCard />
      <SidebarPlaceStatus place={place} className="mb-2 px-1" />
      <div className="flex items-center gap-2 not-first:mt-2">
        <SidebarProfileMenu simple={account} />
        <SidebarConnectApps />
        <SidebarTeamMapButton open={places.teamMapOpen} onOpen={places.onOpenTeamMap} />
        <SidebarTemplatesButton open={places.templatesOpen} onOpen={places.onOpenTemplates} />
        <UpdateIndicator className="size-9" />
      </div>
    </div>
  );
}

export function SidebarFooter({ density, simple = false, owner = null, archived, toolsCollapsed, onToggleTools, places }: {
  density: SidebarDensity;
  simple?: boolean;
  owner?: string | null;
  archived?: ArchivedBots;
  toolsCollapsed: boolean;
  onToggleTools?: () => void;
  places?: Partial<FooterPlaceButtons>;
}) {
  const { dispatch } = useStore();
  const placeButtons: FooterPlaceButtons = {
    teamMapOpen: places?.teamMapOpen ?? false,
    onOpenTeamMap: places?.onOpenTeamMap ?? (() => {}),
    templatesOpen: places?.templatesOpen ?? false,
    onOpenTemplates: places?.onOpenTemplates ?? (() => {}),
  };
  if (simple) return <SimpleSidebarFooter owner={owner} archived={archived} places={placeButtons} />;
  return (
    <div className={cn("pb-3 pt-2", density === "icons" ? "flex flex-col items-center gap-1 px-2" : "px-3")}>
      <SidebarFooterNav density={density} collapsed={toolsCollapsed} onToggleCollapsed={onToggleTools} />
      {density === "icons" ? (
        <>
          <SidebarTeamMapButton open={placeButtons.teamMapOpen} onOpen={placeButtons.onOpenTeamMap} />
          <SidebarTemplatesButton open={placeButtons.templatesOpen} onOpen={placeButtons.onOpenTemplates} />
          <SidebarPhoneButton density={density} onOpen={() => dispatch(phoneSettingsAction())} />
          <div className="flex flex-col items-center justify-center gap-1">
            <UpdateIndicator />
            <SidebarProfileMenu iconOnly />
          </div>
        </>
      ) : (
        <>
          <CloudUsageCard />
          <div className="flex items-center gap-1 not-first:mt-3">
            <div className="min-w-0 flex-1">
              <SidebarProfileMenu />
            </div>
            <SidebarBottomButtons {...placeButtons} />
          </div>
        </>
      )}
    </div>
  );
}
