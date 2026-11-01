// Who you are is fixed by the account you signed in with: no name field, no photo
// upload. The avatar is drawn from the account, so it is the same everywhere.
import { t } from "@/lib/i18n";
import { useStore } from "@/state/store";
import { UserAvatar } from "./UserAvatar";

export function ProfileSummaryRow() {
  const { state } = useStore();
  const profile = state.config?.profile;
  const email = profile?.email?.trim() ?? "";
  return (
    <div data-profile-summary="" className="px-4 py-[13px]">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar seed={email || profile?.name || "person"} size={44} />
        <div className="min-w-0 flex-1 truncate text-[14px] leading-5 text-ink">
          {email || t("settings.simple.account.noName")}
        </div>
      </div>
    </div>
  );
}
