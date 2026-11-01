// Settings → SMS: the one Twilio integration, its sending number, the linked
// phone and the bot that answers. Every write is owner-only; the auth token goes
// in and is never read back out.
import { ownerOrAdmin } from "../request-auth.ts";
import { describeTwilioError } from "../twilio/client.ts";
import type { SmsService } from "../twilio/service.ts";
import { detectTunnels } from "../twilio/tunnels.ts";
import { PASS, type RouteHandler } from "./table.ts";

export interface TwilioRouteDeps {
  sms: SmsService;
  /** The bots a person may point SMS at, by name. */
  bots: () => ReadonlyArray<{ id: string; name: string }>;
  /** The port Twilio actually posts to, for tunnel commands. */
  webhookPort: number;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** The address this page was reached at, when it is one the internet could reach too. */
function requestOrigin(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const proto = first(req.headers["x-forwarded-proto"]) === "https" ? "https" : "http";
  const host = first(req.headers["x-forwarded-host"]) ?? first(req.headers.host) ?? "";
  if (!host || /^(localhost|127\.|\[::1\]|0\.0\.0\.0)(:|$)/i.test(host)) return null;
  return proto + "://" + host;
}

function failure(error: unknown): { status: number; error: string } {
  const status = (error as { status?: unknown })?.status;
  return {
    status: typeof status === "number" && status >= 400 && status <= 599 ? status : 500,
    error: describeTwilioError(error),
  };
}

export function createTwilioRoutes({ sms, bots, webhookPort }: TwilioRouteDeps): RouteHandler {
  return async ({ req, res, path, method, auth, json, readBody }) => {
    if (path !== "/api/twilio" && !path.startsWith("/api/twilio/")) return PASS;
    // Twilio's callback never reaches this module: it lands on the webhook
    // receiver, which verifies Twilio's signature instead of a session.
    if (!ownerOrAdmin(auth)) return json(res, 403, { error: "Only the owner can change SMS settings" });

    if (path === "/api/twilio" && method === "GET") {
      return json(res, 200, { sms: sms.status(), bots: bots() });
    }

    if (path === "/api/twilio/tunnels" && method === "GET") {
      return json(res, 200, { port: webhookPort, options: await detectTunnels(webhookPort) });
    }

    if (path === "/api/twilio/connect" && method === "POST") {
      try {
        const body = await readBody(req, 64 * 1024);
        const result = await sms.connect({
          accountSid: text(body?.accountSid),
          authToken: text(body?.authToken),
          fromNumber: text(body?.fromNumber),
          toNumber: text(body?.toNumber),
          ...(text(body?.botId) ? { botId: text(body?.botId) } : {}),
        });
        return json(res, 200, { sms: result.status, ...(result.warning ? { warning: result.warning } : {}) });
      } catch (error) {
        const { status, error: message } = failure(error);
        return json(res, status, { error: status === 500 ? "Twilio could not be checked: " + message : message });
      }
    }

    if (path === "/api/twilio/number" && method === "POST") {
      try {
        const body = await readBody(req, 16 * 1024);
        return json(res, 200, { sms: sms.linkNumber(text(body?.toNumber), { replace: body?.replace === true }) });
      } catch (error) {
        const { status, error: message } = failure(error);
        return json(res, status, { error: message });
      }
    }

    if (path === "/api/twilio/bot" && method === "POST") {
      try {
        const body = await readBody(req, 8 * 1024);
        return json(res, 200, { sms: sms.designateBot(text(body?.botId)) });
      } catch (error) {
        const { status, error: message } = failure(error);
        return json(res, status, { error: message });
      }
    }

    if (path === "/api/twilio/first-message" && method === "POST") {
      const body = await readBody(req, 8 * 1024);
      // A message costs money and reaches someone's phone: the screen must say so.
      if (body?.confirm !== true) return json(res, 400, { error: "Confirm sending the first text before it is sent" });
      try {
        const result = await sms.sendFirstMessage();
        return json(res, 200, { sms: result.status, sid: result.sid });
      } catch (error) {
        const { status, error: message } = failure(error);
        return json(res, status, { error: message });
      }
    }

    if (path === "/api/twilio/webhook" && method === "POST") {
      try {
        const body = await readBody(req, 8 * 1024);
        const url = body?.useCurrentOrigin === true ? requestOrigin(req) : text(body?.url) || null;
        if (body?.useCurrentOrigin === true && !url) return json(res, 400, { error: "This page's address is not reachable from the internet. Enter the public address instead." });
        return json(res, 200, { sms: await sms.saveWebhook({ url, apply: body?.apply !== false }) });
      } catch (error) {
        const { status, error: message } = failure(error);
        return json(res, status, { error: message });
      }
    }

    if (path === "/api/twilio/webhook" && method === "DELETE") {
      try {
        return json(res, 200, { sms: await sms.saveWebhook({ url: null, apply: false }) });
      } catch (error) {
        const { status, error: message } = failure(error);
        return json(res, status, { error: message });
      }
    }

    if (path === "/api/twilio" && method === "DELETE") {
      return json(res, 200, { sms: sms.disconnect() });
    }

    return json(res, 405, { error: "method not allowed" });
  };
}
