import { useEffect, useState } from "react";
import { MessageSquareText, Send } from "lucide-react";

import { Button, Callout, Checkbox, Field, Input, Select, SettingsCard, StatusDot } from "@/components/ui";
import { t } from "@/lib/i18n";
import { connectSms, designateSmsBot, disconnectSms, linkSmsNumber, readSms, sendFirstSms } from "@/lib/sms";
import { useOwnerOrAdmin } from "@/lib/use-owner-or-admin";
import type { SmsStatus } from "../../shared/twilio";

// One Twilio integration for the whole installation. Everything here talks to
// /api/twilio, which never returns the auth token: the screens after the first
// one only ever show what the server chose to keep.
export function SmsSettings() {
  const ownerOrAdmin = useOwnerOrAdmin();
  const [status, setStatus] = useState<SmsStatus | null>(null);
  const [bots, setBots] = useState<Array<{ id: string; name: string }>>([]);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [botId, setBotId] = useState("");
  const [replaceNumber, setReplaceNumber] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const answer = await readSms();
      setStatus(answer.sms);
      setBots(answer.bots);
      setBotId((current) => current || answer.sms.botId || answer.bots[0]?.id || "");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t("settings.sms.loadError"));
    }
  };

  useEffect(() => { if (ownerOrAdmin) void load(); }, [ownerOrAdmin]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t("settings.sms.saveError"));
    } finally {
      setBusy(false);
    }
  };

  if (!ownerOrAdmin) return null;

  if (status?.connected !== true) {
    return (
      <SettingsCard title={t("settings.sms.title")} subtitle={t("settings.sms.subtitle")}>
        <div className="flex flex-col gap-4">
          <Callout tone="info" icon={<MessageSquareText size={15} />}>{t("settings.sms.oneIntegration")}</Callout>
          <Field label={t("settings.sms.accountSid")} hint={t("settings.sms.accountSidHint")} htmlFor="sms-sid">
            <Input id="sms-sid" value={accountSid} onChange={(event) => setAccountSid(event.target.value)} placeholder="AC…" autoComplete="off" spellCheck={false} />
          </Field>
          <Field label={t("settings.sms.authToken")} hint={t("settings.sms.authTokenHint")} htmlFor="sms-token">
            <Input id="sms-token" type="password" value={authToken} onChange={(event) => setAuthToken(event.target.value)} autoComplete="new-password" spellCheck={false} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("settings.sms.fromNumber")} hint={t("settings.sms.numberHint")} htmlFor="sms-from">
              <Input id="sms-from" value={fromNumber} onChange={(event) => setFromNumber(event.target.value)} placeholder="+14155550123" inputMode="tel" />
            </Field>
            <Field label={t("settings.sms.toNumber")} hint={t("settings.sms.numberHint")} htmlFor="sms-to">
              <Input id="sms-to" value={toNumber} onChange={(event) => setToNumber(event.target.value)} placeholder="+14155550123" inputMode="tel" />
            </Field>
          </div>
          <Field label={t("settings.sms.bot")} hint={t("settings.sms.botHint")} htmlFor="sms-bot">
            <Select id="sms-bot" value={botId} onChange={(event) => setBotId(event.target.value)}>
              {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </Select>
          </Field>
          <div>
            <Button
              variant="primary"
              loading={busy}
              disabled={busy || !accountSid.trim() || !authToken.trim() || !fromNumber.trim() || !toNumber.trim()}
              onClick={() => void run(async () => {
                const saved = await connectSms({ accountSid, authToken, fromNumber, toNumber, ...(botId ? { botId } : {}) });
                setStatus(saved.sms);
                setAuthToken("");
                setNotice(saved.warning ?? t("settings.sms.connected"));
              })}
            >
              {t("settings.sms.connect")}
            </Button>
          </div>
          {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
          {notice ? <Callout tone="success">{notice}</Callout> : null}
        </div>
      </SettingsCard>
    );
  }

  const row = "flex items-start justify-between gap-4 text-[13px]";
  return (
    <SettingsCard title={t("settings.sms.title")} subtitle={t("settings.sms.subtitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[13px] text-ink">
          <StatusDot state="done" label={t("settings.sms.connected")} />
          <span className="font-medium">{status.accountName}</span>
          <span className="text-ink-tertiary">{status.accountSid}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className={row}><span className="text-ink-secondary">{t("settings.sms.fromLabel")}</span><span className="tabular-nums">{status.fromNumber}</span></div>
          <div className={row}><span className="text-ink-secondary">{t("settings.sms.toLabel")}</span><span className="tabular-nums">{status.toNumber}</span></div>
        </div>

        <Field label={t("settings.sms.bot")} hint={t("settings.sms.botHint")} htmlFor="sms-bot-connected">
          <Select
            id="sms-bot-connected"
            value={status.botId ?? ""}
            disabled={busy || bots.length < 2}
            onChange={(event) => void run(async () => { setStatus(await designateSmsBot(event.target.value)); })}
          >
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </Select>
        </Field>
        <Callout tone="info">{t("settings.sms.recommendation")}</Callout>

        {status.webhookUrl ? (
          <Field label={t("settings.sms.webhook")} hint={t("settings.sms.webhookHint")} htmlFor="sms-webhook">
            <Input id="sms-webhook" readOnly value={status.webhookUrl} onFocus={(event) => event.currentTarget.select()} />
          </Field>
        ) : (
          <Callout tone="warning">{t("settings.sms.webhookMissing")} {status.webhookError ?? ""}</Callout>
        )}

        {status.firstMessageAt ? (
          <div className={row}><span className="text-ink-secondary">{t("settings.sms.firstSent")}</span><span>{new Date(status.firstMessageAt).toLocaleString()}</span></div>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl bg-inset p-3">
            <label className="flex items-start gap-2 text-[13px] text-ink-secondary">
              <Checkbox checked={confirmed} onChange={setConfirmed} />
              <span>{t("settings.sms.firstConfirm")}</span>
            </label>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              disabled={busy || !confirmed || !status.webhookUrl}
              onClick={() => void run(async () => {
                const sent = await sendFirstSms();
                setStatus(sent.sms);
                setNotice(t("settings.sms.firstSentNotice"));
              })}
            >
              <Send size={14} /> {t("settings.sms.sendFirst")}
            </Button>
          </div>
        )}

        <Field label={t("settings.sms.replaceNumber")} hint={t("settings.sms.replaceHint")} htmlFor="sms-replace">
          <div className="flex gap-2">
            <Input id="sms-replace" value={replaceNumber} onChange={(event) => setReplaceNumber(event.target.value)} placeholder="+14155550123" inputMode="tel" />
            <Button
              size="sm"
              disabled={busy || !replaceNumber.trim()}
              onClick={() => void run(async () => {
                setStatus(await linkSmsNumber(replaceNumber, true));
                setReplaceNumber("");
                setNotice(t("settings.sms.numberChanged"));
              })}
            >
              {t("settings.sms.replace")}
            </Button>
          </div>
        </Field>

        <div className="flex items-center justify-between gap-4 border-t-[0.5px] border-hairline pt-3">
          <span className="text-[12px] text-ink-tertiary">{t("settings.sms.disconnectHint")}</span>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void run(async () => { setStatus(await disconnectSms()); })}>
            {t("settings.sms.disconnect")}
          </Button>
        </div>
        {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}
      </div>
    </SettingsCard>
  );
}
