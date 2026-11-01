import { useEffect, useState } from "react";
import { Check, Copy, Send } from "lucide-react";

import { Button, Callout, Checkbox, Field, Input, SettingsCard, StatePill } from "@/components/ui";
import { Select } from "@/components/Select";
import { t } from "@/lib/i18n";
import { clearSmsWebhook, connectSms, designateSmsBot, disconnectSms, linkSmsNumber, readSms, readSmsTunnels, saveSmsWebhook, sendFirstSms, type SmsTunnelOption } from "@/lib/sms";
import { useOwnerOrAdmin } from "@/lib/use-owner-or-admin";
import { maskSid, type SmsStatus } from "../../shared/twilio";

const TUNNEL_LABELS: Record<SmsTunnelOption["id"], string> = {
  cloudflare: "Cloudflare Tunnel",
  tailscale: "Tailscale Funnel",
  ngrok: "ngrok",
};

const GROUP = "text-[12px] font-medium uppercase tracking-wide text-ink-secondary";
const ROW = "flex items-center justify-between gap-4 text-[13px]";

/** Settings → Experimental → SMS: one Twilio account, one sending number, one phone and one bot. */
export function SmsSettings() {
  const ownerOrAdmin = useOwnerOrAdmin();
  const [status, setStatus] = useState<SmsStatus | null>(null);
  const [bots, setBots] = useState<Array<{ id: string; name: string }>>([]);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [botId, setBotId] = useState("");
  const [webhook, setWebhook] = useState("");
  const [replaceNumber, setReplaceNumber] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tunnels, setTunnels] = useState<{ port: number; options: SmsTunnelOption[] } | null>(null);

  const apply = (next: SmsStatus) => { setStatus(next); setWebhook(next.webhookUrl ?? ""); };

  const load = async () => {
    try {
      const answer = await readSms();
      apply(answer.sms);
      setBots(answer.bots);
      setBotId((current) => current || answer.sms.botId || answer.bots[0]?.id || "");
      setError(null);
      setTunnels(await readSmsTunnels().catch(() => null));
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t("settings.sms.loadError"));
    }
  };

  useEffect(() => { if (ownerOrAdmin) void load(); }, [ownerOrAdmin]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try { await work(); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : t("settings.sms.saveError")); }
    finally { setBusy(false); }
  };

  if (!ownerOrAdmin) return null;

  if (status?.connected !== true) {
    return (
      <SettingsCard title={t("settings.sms.title")} subtitle={t("settings.sms.subtitle")}>
        <div className="flex flex-col gap-6">
          <p className="text-[13px] leading-relaxed text-ink-secondary">{t("settings.sms.oneIntegration")}</p>
          <section className="flex flex-col gap-4">
            <div className={GROUP}>{t("settings.sms.accountGroup")}</div>
            <Field label={t("settings.sms.accountSid")} hint={t("settings.sms.accountSidHint")} htmlFor="sms-sid">
              <Input id="sms-sid" value={accountSid} onChange={(event) => setAccountSid(event.target.value)} placeholder="AC…" autoComplete="off" spellCheck={false} />
            </Field>
            <Field label={t("settings.sms.authToken")} hint={t("settings.sms.authTokenHint")} htmlFor="sms-token">
              <Input id="sms-token" type="password" value={authToken} onChange={(event) => setAuthToken(event.target.value)} autoComplete="new-password" spellCheck={false} />
            </Field>
          </section>
          <section className="flex flex-col gap-4">
            <div className={GROUP}>{t("settings.sms.numbersGroup")}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("settings.sms.fromNumber")} hint={t("settings.sms.numberHint")} htmlFor="sms-from">
                <Input id="sms-from" value={fromNumber} onChange={(event) => setFromNumber(event.target.value)} placeholder="+14155550123" inputMode="tel" />
              </Field>
              <Field label={t("settings.sms.toNumber")} hint={t("settings.sms.numberHint")} htmlFor="sms-to">
                <Input id="sms-to" value={toNumber} onChange={(event) => setToNumber(event.target.value)} placeholder="+14155550123" inputMode="tel" />
              </Field>
            </div>
          </section>
          <Field label={t("settings.sms.bot")} hint={t("settings.sms.botHint")} htmlFor="sms-bot">
            <Select id="sms-bot" value={botId} onChange={(event) => setBotId(event.target.value)}>
              {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
            </Select>
          </Field>
          <Callout tone="info">{t("settings.sms.recommendation")}</Callout>
          <div>
            <Button variant="primary" loading={busy}
              disabled={busy || !accountSid.trim() || !authToken.trim() || !fromNumber.trim() || !toNumber.trim()}
              onClick={() => void run(async () => {
                const saved = await connectSms({ accountSid, authToken, fromNumber, toNumber, ...(botId ? { botId } : {}) });
                apply(saved.sms); setAuthToken(""); setNotice(t("settings.sms.connected"));
              })}>
              {t("settings.sms.connect")}
            </Button>
          </div>
          {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
          {notice ? <Callout tone="success">{notice}</Callout> : null}
        </div>
      </SettingsCard>
    );
  }

  const reachable = Boolean(status.webhookUrl);
  return (
    <SettingsCard title={t("settings.sms.title")} subtitle={t("settings.sms.subtitle")}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatePill tone="success">{t("settings.sms.connected")}</StatePill>
          <span className="text-[14px] font-medium text-ink">{status.accountName}</span>
          <span className="text-[12px] text-ink-tertiary">{status.accountSid ? maskSid(status.accountSid) : ""}</span>
        </div>
        <section className="flex flex-col gap-2 rounded-xl bg-inset p-3">
          <div className={ROW}><span className="text-ink-secondary">{t("settings.sms.fromLabel")}</span><span className="tabular-nums text-ink">{status.fromNumber}</span></div>
          <div className={ROW}><span className="text-ink-secondary">{t("settings.sms.toLabel")}</span><span className="tabular-nums text-ink">{status.toNumber}</span></div>
        </section>
        <Field label={t("settings.sms.bot")} hint={t("settings.sms.botHint")} htmlFor="sms-bot-connected">
          <Select id="sms-bot-connected" value={status.botId ?? ""} disabled={busy || bots.length < 2}
            onChange={(event) => void run(async () => { apply(await designateSmsBot(event.target.value)); })}>
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </Select>
        </Field>
        <section className="flex flex-col gap-3 rounded-xl border border-hairline/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[14px] font-medium text-ink">{t("settings.sms.webhook")}</span>
            <StatePill tone={reachable ? "success" : "warning"}>{reachable ? t("settings.sms.webhookReachable") : t("settings.sms.webhookUnreachable")}</StatePill>
          </div>
          <p className="text-[13px] leading-relaxed text-ink-secondary">{t("settings.sms.webhookExplain")}</p>
          {status.webhookUrl ? (
            <div className="flex items-center gap-2">
              <Input id="sms-webhook" readOnly value={status.webhookUrl} onFocus={(event) => event.currentTarget.select()} className="font-mono text-[12px]" />
              <Button size="sm" variant="ghost" aria-label={t("settings.sms.copy")}
                onClick={() => void navigator.clipboard?.writeText(status.webhookUrl ?? "").then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          ) : null}

          <Field label={t("settings.sms.webhookAddress")} hint={t("settings.sms.webhookAddressHint")} htmlFor="sms-webhook-address">
            <Input id="sms-webhook-address" value={webhook} onChange={(event) => setWebhook(event.target.value)} placeholder="https://bots.example.com" spellCheck={false} />
          </Field>
          <details className="rounded-xl bg-inset p-3">
            <summary className="cursor-pointer text-[13px] font-medium text-ink">{t("settings.sms.tunnelTitle")}</summary>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{t("settings.sms.tunnelHint", { port: tunnels?.port ?? 0 })}</p>
            {tunnels ? <ul className="mt-2 flex flex-col gap-2">
              {tunnels.options.map((option) => (
                <li key={option.id} className="rounded-lg bg-card p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-ink">{TUNNEL_LABELS[option.id]}</span>
                    <StatePill tone={option.installed ? "success" : "neutral"}>{option.installed ? t("settings.sms.tunnelInstalled") : t("settings.sms.tunnelMissing")}</StatePill>
                    <a href={option.docs} target="_blank" rel="noreferrer" className="ml-auto text-[12px] text-ink-secondary underline">{t("settings.sms.tunnelDocs")}</a>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-secondary">{option.command}</code>
                    <Button size="xs" variant="ghost" aria-label={t("settings.sms.tunnelCopy")} onClick={() => void navigator.clipboard?.writeText(option.command)}><Copy size={13} /></Button>
                  </div>
                </li>
              ))}
            </ul> : null}
          </details>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" loading={busy} disabled={busy || !webhook.trim()}
              onClick={() => void run(async () => { apply(await saveSmsWebhook({ url: webhook.trim() })); setNotice(t("settings.sms.webhookSaved")); })}>
              {t("settings.sms.webhookSave")}
            </Button>
            <Button size="sm" disabled={busy}
              onClick={() => void run(async () => { apply(await saveSmsWebhook({ useCurrentOrigin: true })); setNotice(t("settings.sms.webhookSaved")); })}>
              {t("settings.sms.webhookUsePage")}
            </Button>
            {status.webhookSource === "saved" ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(async () => { apply(await clearSmsWebhook()); })}>
                {t("settings.sms.webhookClear")}
              </Button>
            ) : null}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-xl bg-inset p-3">
          <div className="text-[14px] font-medium text-ink">{t("settings.sms.firstTextTitle")}</div>
          {status.firstMessageAt ? (
            <div className={ROW}><span className="text-ink-secondary">{t("settings.sms.firstSent")}</span><span className="text-ink">{new Date(status.firstMessageAt).toLocaleString()}</span></div>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-ink-secondary">{t("settings.sms.firstMessageHint")}</p>
              <label className="flex items-start gap-2 text-[13px] text-ink-secondary">
                <Checkbox checked={confirmed} onChange={setConfirmed} />
                <span>{t("settings.sms.firstConfirm")}</span>
              </label>
              <div>
                <Button variant="primary" size="sm" loading={busy} disabled={busy || !confirmed}
                  onClick={() => void run(async () => { apply((await sendFirstSms()).sms); setNotice(t("settings.sms.firstSentNotice")); })}>
                  <Send size={14} /> {t("settings.sms.sendFirst")}
                </Button>
              </div>
            </>
          )}
        </section>
        <Field label={t("settings.sms.replaceNumber")} hint={t("settings.sms.replaceHint")} htmlFor="sms-replace">
          <div className="flex gap-2">
            <Input id="sms-replace" value={replaceNumber} onChange={(event) => setReplaceNumber(event.target.value)} placeholder="+14155550123" inputMode="tel" />
            <Button size="sm" disabled={busy || !replaceNumber.trim()}
              onClick={() => void run(async () => { apply(await linkSmsNumber(replaceNumber, true)); setReplaceNumber(""); setNotice(t("settings.sms.numberChanged")); })}>
              {t("settings.sms.replace")}
            </Button>
          </div>
        </Field>
        {status.lastError ? <Callout tone="warning">{t("settings.sms.lastError", { error: status.lastError })}</Callout> : null}
        {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}
        <div className="flex items-center justify-between gap-4 border-t-[0.5px] border-hairline pt-3">
          <span className="text-[12px] text-ink-tertiary">{t("settings.sms.disconnectHint")}</span>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void run(async () => { apply(await disconnectSms()); })}>
            {t("settings.sms.disconnect")}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}

