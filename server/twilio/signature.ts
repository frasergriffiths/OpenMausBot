// Twilio signs each webhook with HMAC-SHA1 over the full URL, then every POST
// field as key-then-value, with the account's auth token as the key. Checking it
// is what makes the public receiver safe: without a valid signature the caller
// could start turns with text of its choosing.
import { createHmac, timingSafeEqual } from "node:crypto";

/** Twilio's own recipe, verbatim, so a known-answer test can pin it. */
export function twilioSignature(authToken: string, url: string, params: Readonly<Record<string, string>>): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(Buffer.from(payload, "utf8")).digest("base64");
}

const hexToBuffer = (value: unknown): Buffer | null => {
  if (typeof value !== "string" || !/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  return Buffer.from(value, "hex");
};

/**
 * `X-Twilio-Signature` is hex-encoded in the header Twilio sends today and
 * base64 in most of its examples; both are accepted when the HMAC matches.
 */
export function verifyTwilioSignature(input: {
  authToken: string;
  url: string;
  params: Readonly<Record<string, string>>;
  signature: unknown;
}): boolean {
  const given = input.signature;
  if (typeof given !== "string" || !given) return false;
  const expected = twilioSignature(input.authToken, input.url, input.params);
  const candidates = new Set([expected, Buffer.from(expected, "base64").toString("hex")]);
  for (const candidate of candidates) {
    const a = Buffer.from(candidate, "utf8");
    const b = Buffer.from(given.trim(), "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  // A hex header against a base64 expectation, and the reverse.
  const asHex = hexToBuffer(given.trim());
  if (asHex) {
    const expectedHex = Buffer.from(expected, "base64");
    if (asHex.length === expectedHex.length && timingSafeEqual(asHex, expectedHex)) return true;
  }
  return false;
}
