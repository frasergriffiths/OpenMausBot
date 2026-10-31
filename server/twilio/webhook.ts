// Twilio's own callback, served by the webhook receiver (a separate loopback
// listener that carries a public address), never by the app's authenticated API:
// Twilio has no session and must not be given one.
import type { IncomingMessage, ServerResponse } from "node:http";

import type { SmsService } from "./service.ts";

export const SMS_WEBHOOK_PATH = "/twilio/sms";

/** TwiML with no message in it: the callback is acknowledged, the bot answers by REST. */
function twiml(res: ServerResponse, status = 200): void {
  res.writeHead(status, { "content-type": "text/xml; charset=utf-8", "cache-control": "no-store" });
  res.end('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
}

export interface SmsWebhookOptions {
  sms: SmsService;
  /** The address Twilio was told to post to, when there is one. */
  publicBaseUrl?: () => string | null;
}

export function createSmsWebhook({ sms, publicBaseUrl }: SmsWebhookOptions) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL, readRaw: (req: IncomingMessage) => Promise<string>): Promise<boolean> => {
    if (url.pathname !== SMS_WEBHOOK_PATH) return false;
    if (req.method !== "POST") {
      res.writeHead(405, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "SMS callbacks accept POST" }));
      return true;
    }
    let params: Record<string, string> = {};
    try {
      params = Object.fromEntries(new URLSearchParams(await readRaw(req)));
    } catch {
      res.writeHead(413, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "The callback was too large" }));
      return true;
    }
    // Twilio signs the URL it was configured with. Behind a tunnel that URL is the
    // public one, which the request itself does not carry, so both are tried.
    const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const origin = proto + "://" + (req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost");
    const advertised = publicBaseUrl?.() ?? null;
    const urls = [
      ...(advertised ? [advertised.replace(/\/+$/, "") + url.pathname + url.search] : []),
      origin + (req.url ?? url.pathname),
    ];
    const result = await sms.inbound({ urls, params, signature: req.headers["x-twilio-signature"] });
    if (result.ok) {
      twiml(res);
      return true;
    }
    const status = result.status === 403 ? 403 : result.status === 404 ? 404 : 400;
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: result.error }));
    return true;
  };
}
