import type { SmsStatus } from "../../shared/twilio";
import { api } from "@/state/store";

export interface SmsTunnelOption {
  id: "cloudflare" | "tailscale" | "ngrok";
  command: string;
  installed: boolean;
  docs: string;
}

/** The tunnel clients this computer could use to give Twilio a public address. */
export async function readSmsTunnels(): Promise<{ port: number; options: SmsTunnelOption[] }> {
  return await api<{ port: number; options: SmsTunnelOption[] }>("/api/twilio/tunnels");
}

/** Settings → SMS: one integration, one linked phone, one bot that answers. */
export async function readSms(): Promise<{ sms: SmsStatus; bots: Array<{ id: string; name: string }> }> {
  return await api<{ sms: SmsStatus; bots: Array<{ id: string; name: string }> }>("/api/twilio");
}

export async function connectSms(input: { accountSid: string; authToken: string; fromNumber: string; toNumber: string; botId?: string }): Promise<{ sms: SmsStatus; warning?: string }> {
  return await api<{ sms: SmsStatus; warning?: string }>("/api/twilio/connect", { method: "POST", body: JSON.stringify(input) });
}

/** Replacing the number is the only way to move it: there is never a second one. */
export async function linkSmsNumber(toNumber: string, replace = false): Promise<SmsStatus> {
  return (await api<{ sms: SmsStatus }>("/api/twilio/number", { method: "POST", body: JSON.stringify({ toNumber, replace }) })).sms;
}

export async function designateSmsBot(botId: string): Promise<SmsStatus> {
  return (await api<{ sms: SmsStatus }>("/api/twilio/bot", { method: "POST", body: JSON.stringify({ botId }) })).sms;
}

export async function sendFirstSms(): Promise<{ sms: SmsStatus; sid: string }> {
  return await api<{ sms: SmsStatus; sid: string }>("/api/twilio/first-message", { method: "POST", body: JSON.stringify({ confirm: true }) });
}

export async function saveSmsWebhook(input: { url?: string; useCurrentOrigin?: boolean }): Promise<SmsStatus> {
  return (await api<{ sms: SmsStatus }>("/api/twilio/webhook", { method: "POST", body: JSON.stringify(input) })).sms;
}

export async function clearSmsWebhook(): Promise<SmsStatus> {
  return (await api<{ sms: SmsStatus }>("/api/twilio/webhook", { method: "DELETE" })).sms;
}

export async function disconnectSms(): Promise<SmsStatus> {
  return (await api<{ sms: SmsStatus }>("/api/twilio", { method: "DELETE" })).sms;
}
