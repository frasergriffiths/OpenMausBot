// Where Twilio should post inbound texts, saved next to the integration.
//
// The environment variable is the installation's default; a value saved from the
// settings screen wins over it, so a person can point the webhook at a tunnel
// without restarting the server. One value, one file.
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeFileAtomic } from "../atomic.ts";

const file = (dataDir: string) => join(dataDir, "sms-webhook.json");

export function readWebhookBaseUrl(dataDir: string): string | null {
  try {
    const parsed = JSON.parse(readFileSync(file(dataDir), "utf8")) as { baseUrl?: unknown };
    return normaliseBaseUrl(parsed.baseUrl);
  } catch {
    return null;
  }
}

export function writeWebhookBaseUrl(dataDir: string, value: string | null): void {
  if (value === null) {
    rmSync(file(dataDir), { force: true });
    return;
  }
  mkdirSync(dirname(file(dataDir)), { recursive: true });
  writeFileAtomic(file(dataDir), JSON.stringify({ baseUrl: value }, null, 2) + "\n", { mode: 0o600 });
}

/** An http(s) origin with no path: the app appends /twilio/sms itself. */
export function normaliseBaseUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  return url.origin;
}
