// The two Twilio calls this app makes: prove an account is real, and send one
// message. Nothing else reaches api.twilio.com, and the auth token appears only
// in the Authorization header of these two requests.
import { z } from "zod";

export const TWILIO_API_URL = "https://api.twilio.com";
export const TWILIO_API_ENV = "OMB_TWILIO_API_URL";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 1_000_000;

export class TwilioError extends Error {
  readonly status: number | undefined;
  /** Twilio's own numeric code (21608 unverified number, 21211 bad To, and so on). */
  readonly code: number | undefined;
  constructor(message: string, options: { status?: number; code?: number } = {}) {
    super(message);
    this.name = "TwilioError";
    this.status = options.status;
    this.code = options.code;
  }
}

const account = z.object({ sid: z.string(), friendly_name: z.string().nullable().optional(), status: z.string().nullable().optional() });
const message = z.object({ sid: z.string(), status: z.string().nullable().optional(), num_segments: z.string().nullable().optional() });
const failure = z.object({ code: z.number().nullable().optional(), message: z.string().nullable().optional() });

export interface TwilioClientOptions {
  apiBase?: string;
  fetch?: typeof fetch;
}

export interface TwilioAccount {
  sid: string;
  name: string;
  status: string;
}

export interface TwilioSendResult {
  sid: string;
  status: string;
  numSegments: number | null;
}

export interface TwilioClient {
  validate(): Promise<TwilioAccount>;
  send(input: { from: string; to: string; body: string }): Promise<TwilioSendResult>;
}

/** A friendly sentence for the screen, keeping Twilio's own wording when it has any. */
export function describeTwilioError(error: unknown): string {
  if (error instanceof TwilioError) return error.message;
  return error instanceof Error ? error.message : String(error);
}

export function createTwilioClient(credentials: { accountSid: string; authToken: string }, options: TwilioClientOptions = {}): TwilioClient {
  const base = (options.apiBase ?? process.env[TWILIO_API_ENV] ?? TWILIO_API_URL).replace(/\/+$/, "");
  const doFetch = options.fetch ?? fetch;
  const authorization = `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`;

  const call = async (path: string, init: RequestInit = {}): Promise<unknown> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await doFetch(`${base}${path}`, {
        ...init,
        headers: { authorization, accept: "application/json", ...init.headers },
        signal: controller.signal,
      });
    } catch (error) {
      throw new TwilioError(error instanceof Error && error.name === "AbortError"
        ? "Twilio did not answer in time"
        : "Twilio could not be reached from this computer");
    } finally {
      clearTimeout(timer);
    }
    const raw = await response.text();
    if (raw.length > MAX_RESPONSE_BYTES) throw new TwilioError("Twilio's answer was too large");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = null;
    }
    if (!response.ok) {
      const parsed = failure.safeParse(body);
      const detail = parsed.success ? parsed.data.message ?? null : null;
      throw new TwilioError(
        response.status === 401 ? "Twilio refused the SID and auth token" : detail ?? `Twilio answered ${response.status}`,
        { status: response.status, ...(parsed.success && parsed.data.code ? { code: parsed.data.code } : {}) },
      );
    }
    return body;
  };

  return {
    async validate() {
      const parsed = account.safeParse(await call(`/2010-04-01/Accounts/${encodeURIComponent(credentials.accountSid)}.json`));
      if (!parsed.success) throw new TwilioError("Twilio's account answer did not look like an account");
      if (parsed.data.sid !== credentials.accountSid) throw new TwilioError("That SID belongs to a different account");
      return { sid: parsed.data.sid, name: parsed.data.friendly_name ?? parsed.data.sid, status: parsed.data.status ?? "active" };
    },

    async send(input) {
      const form = new URLSearchParams({ To: input.to, From: input.from, Body: input.body });
      const parsed = message.safeParse(await call(`/2010-04-01/Accounts/${encodeURIComponent(credentials.accountSid)}/Messages.json`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }));
      if (!parsed.success) throw new TwilioError("Twilio accepted the message but its answer did not look like one");
      const segments = parsed.data.num_segments ? Number.parseInt(parsed.data.num_segments, 10) : null;
      return { sid: parsed.data.sid, status: parsed.data.status ?? "queued", numSegments: Number.isFinite(segments) ? segments : null };
    },
  };
}
