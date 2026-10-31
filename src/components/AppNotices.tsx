import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { api, useStore } from "@/state/store";
import { APP_REPOSITORY } from "@/lib/app-links";
import { brandStatus } from "@/lib/brand";
import { cornerPopupWaits, firstReplyPending } from "@/lib/corner-popup";
import { CLOUD_INTRO, CLOUD_NOTICE, CLOUD_PRO_UPDATE_NOTICE, CLOUD_TRIAL_NOTICE, dismissNotice, nextNotice, noticeSeen, STAR_NOTICE, UPDATES_CONSENT_NOTICE, USE_MY_COMPUTER_NOTICE, usedBefore } from "@/lib/notices";
import { welcomeFinishedThisLaunch, type WelcomeViewer } from "@/lib/onboarding";
import { launchDialogShown, markLaunchDialog } from "@/lib/launch-dialogs";
import { useUpdaterState } from "@/lib/updater";
import { activeLocale, t } from "@/lib/i18n";
import { useUseMyComputerDue } from "@/lib/use-my-computer-notice";
import { useMoveQuiet } from "./CloudSendStrip";
import { useOtherDialogOpen } from "./other-dialog-open";
import { LinkButton, NoticeCard, NoticeToast, NotNowButton } from "./NoticeCard";
import { localDesktopPage } from "./onboarding/WelcomeGate";
import { UpdatesConsentDialog, updatesConsentBridge, useUpdatesConsent } from "./UpdatesConsent";
import { useMausBotWelcomeDue } from "./MausBotWelcome";

function StarCard({ onDismiss }: { onDismiss: () => void }) {
  return <NoticeCard titleId="github-star-title" notice="github-star" icon={Star} title={t("star.title")} onDismiss={onDismiss}>
    <p className="mb-3 mt-1 text-[13px] text-ink-secondary">{t("star.body")}</p>
    <div className="flex flex-wrap items-center gap-3">
      <LinkButton url={APP_REPOSITORY} label={t("star.button")} onOpened={onDismiss} />
      <NotNowButton onClick={onDismiss} />
    </div>
  </NoticeCard>;
}

export function AppNotices({ quiet = false, viewer = null, now = Date.now }: { quiet?: boolean; viewer?: WelcomeViewer | null; now?: () => number }) {
  const { state, dispatch } = useStore();
  const remote = window.ogb?.remoteClient?.active === true;
  const local = localDesktopPage();
  const [toast, setToast] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const consentHere = (local || viewer?.cloudHome === true) && brandStatus().source !== "file";
  const consent = useUpdatesConsent(consentHere ? updatesConsentBridge() : undefined);
  const [consentDone, setConsentDone] = useState(false);
  const [macAsked, setMacAsked] = useState(false);
  const [macAsking, setMacAsking] = useState(false);
  const updater = useUpdaterState();
  const moving = useMoveQuiet(now);
  const mausBot = useMausBotWelcomeDue(viewer);
  const lending = remote ? undefined : window.ogb?.cloudLending;
  const macDue = useUseMyComputerDue(lending, macAsked);
  const macBlocked = useOtherDialogOpen(macDue === true) || Boolean(state.liveCall && state.liveCall.status !== "ended");
  const consentDue = consent.state?.available === true && consent.state.due && !consentDone;
  const consentBlocked = useOtherDialogOpen(consentDue) || Boolean(state.liveCall && state.liveCall.status !== "ended");
  const consentFact = !consentHere || consentDone ? false : consent.state === undefined ? null : consentDue ? (consentBlocked ? null : true) : false;
  const record = state.config?.onboarding;
  const waits = cornerPopupWaits(state, updater, { quiet, idle: true, viewer }) || Boolean(state.cloudAdd);
  const firstChat = firstReplyPending(state);
  const afterWelcome = welcomeFinishedThisLaunch() || launchDialogShown() === "mausbot" || firstChat;
  const consentWaits = welcomeFinishedThisLaunch() || firstChat;
  const mausBotFirst = mausBot.due;
  const consentNow = consentWaits === true || consentFact === false ? false : consentWaits === null || mausBotFirst ? null : consentFact;
  const notice = waits ? null : closed ? (consentNow === true ? UPDATES_CONSENT_NOTICE : null) : consentHere || Boolean(lending) ? nextNotice({
    [USE_MY_COMPUTER_NOTICE]: moving || macDue === false || afterWelcome === true ? false
      : macDue === null || moving === null || afterWelcome === null || mausBotFirst || macBlocked ? null : true,
    [UPDATES_CONSENT_NOTICE]: consentNow,
    [STAR_NOTICE]: moving || brandStatus().source === "file" || !usedBefore(state.bots) ? false : moving === null ? null : true,
    [CLOUD_PRO_UPDATE_NOTICE]: false,
    [CLOUD_INTRO]: false,
    [CLOUD_TRIAL_NOTICE]: false,
    [CLOUD_NOTICE]: false,
  }, id => id === STAR_NOTICE ? noticeSeen(record, id) : false) : null;

  useEffect(() => {
    if (!notice) return;
    if (notice === USE_MY_COMPUTER_NOTICE || notice === UPDATES_CONSENT_NOTICE) markLaunchDialog("notices");
    if (notice === USE_MY_COMPUTER_NOTICE && !macAsking) {
      setMacAsking(true);
      void lending?.ask?.(activeLocale()).catch(() => {}).finally(() => { setMacAsked(true); close(); });
    }
  }, [notice]);

  const save = (id: string) => {
    const patch = dismissNotice(record, id);
    if (patch) void api("/api/config", { method: "PUT", body: JSON.stringify(patch) })
      .then(config => dispatch({ type: "configStatus", config })).catch(() => {});
  };
  const close = () => { setClosed(true); };
  if (toast) return <NoticeToast text={toast} onDone={() => setToast(null)} />;
  if (!notice) return null;

  if (notice === UPDATES_CONSENT_NOTICE && consent.state) {
    const done = () => { setConsentDone(true); close(); };
    return <UpdatesConsentDialog signedIn={consent.state.signedIn}
      onYes={async email => { await consent.choose("opted_in", email); done(); }}
      onNo={() => { done(); void consent.choose("declined").catch(() => {}); }} />;
  }
  if (notice === STAR_NOTICE) return <StarCard onDismiss={() => { close(); save(STAR_NOTICE); }} />;
  return null;
}

