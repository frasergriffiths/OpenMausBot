import { createHash } from "node:crypto";
import { canonicalToolkitSlug } from "./composio-project.ts";

const ACCOUNT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function canonicalServiceRecord<T>(services: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(services).map(([slug, state]) => [canonicalToolkitSlug(slug), state]),
  );
}

export function requestedServiceRecord<T>(services: Record<string, T>, requested: string[]): Record<string, T> {
  const canonical = canonicalServiceRecord(services);
  return Object.fromEntries(
    requested.flatMap((slug) => {
      const state = canonical[canonicalToolkitSlug(slug)];
      return state === undefined ? [] : [[slug, state]];
    }),
  );
}

export function validAccountId(value: string | undefined): value is string {
  return Boolean(value && ACCOUNT_ID.test(value));
}

/** Separates caches and transports per credential without keeping another plaintext copy of it. */
export function backendFingerprint(kind: string, endpoint: string, credential: string): string {
  return createHash("sha256")
    .update(kind)
    .update("\0")
    .update(endpoint)
    .update("\0")
    .update(credential)
    .digest("hex");
}
