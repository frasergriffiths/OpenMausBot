/**
 * The one Twilio SMS integration an installation may have, as the app and its
 * server both describe it.
 *
 * The shapes here are deliberately flat: one account, one sending number, one
 * linked phone and one designated bot. There is no list of integrations to
 * index into, so a second one cannot be represented, let alone stored.
 */

export interface SmsIntegration {
  /** The Twilio Account SID, as the person pasted it. */
  accountSid: string;
  /** The account's friendly name, from the validation call that admitted it. */
  accountName: string;
  /** The E.164 number every message is sent from. */
  fromNumber: string;
  /** The one phone this installation talks to, in E.164. */
  toNumber: string;
  /** The bot that handles every inbound and outbound message. */
  botId: string;
  linkedAt: number;
  updatedAt: number;
}

/** What the settings screen sees: the integration, never its credentials. */
export interface SmsStatus {
  connected: boolean;
  accountSid: string | null;
  accountName: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  botId: string | null;
  botName: string | null;
  /** Where Twilio should deliver inbound messages, when the receiver is reachable. */
  webhookUrl: string | null;
  /** Why the receiver cannot be reached, when it cannot. */
  webhookError: string | null;
  linkedAt: number | null;
  /** When the first message was sent, or null while it never has been. */
  firstMessageAt: number | null;
  /** The last failure the integration hit, cleared by the next success. */
  lastError: string | null;
  updatedAt: number | null;
}

/** A Twilio account SID is `AC` and 32 hex characters. */
export const TWILIO_SID = /^AC[0-9a-f]{32}$/i;

/**
 * The one phone number shape: `+`, a country code that does not start with 0,
 * then 6 to 14 more digits. Deliberately stricter than "any digits": a pasted
 * 07… local number is refused rather than sent to a stranger's line.
 */
export const E164 = /^\+[1-9]\d{6,14}$/;

export function normalisePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/[\s().-]/g, "");
  if (!trimmed) return null;
  const withPlus = trimmed.startsWith("+") ? trimmed : trimmed.startsWith("00") ? `+${trimmed.slice(2)}` : trimmed;
  return E164.test(withPlus) ? withPlus : null;
}

/** A SID is not secret, but the screen shows only enough to recognise the account. */
export function maskSid(sid: string): string {
  return sid.length <= 8 ? sid : `${sid.slice(0, 6)}…${sid.slice(-4)}`;
}

/**
 * Twilio joins up to 1,530 characters into one concatenated message; past that
 * a reply is split, on paragraph then sentence then word boundaries, so nothing
 * arrives out of order and nothing is cut mid-word.
 */
export const SMS_SEGMENT_CHARS = 1_530;

export function splitSms(body: string, limit = SMS_SEGMENT_CHARS): string[] {
  const text = body.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const at = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n"), window.lastIndexOf(" "));
    const cut = at > limit / 2 ? at + (window[at] === "." ? 1 : 0) : limit;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  parts.push(rest);
  return parts.filter(Boolean);
}
