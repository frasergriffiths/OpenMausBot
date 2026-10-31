# Twilio SMS

One Twilio integration per installation. It is not a per-bot connector: every bot
shares the same account, the same sending number and the same linked phone, and
exactly one bot answers. Settings → SMS is the only place it is configured.

## What the person sets up

1. **Account SID and auth token** from Twilio Console → Account Info.
2. **Sending number**: a Twilio number on that account that can send SMS.
3. **Your phone**: the one number this installation talks to, in E.164 (+14155550123).
4. **The bot that answers**: the Chief of Staff is the default, because it can
   delegate to the other bots, so one text can reach everything the installation does.
5. **The first text**: sent only after the person ticks the confirmation box.

The server validates the SID and token with Twilio before storing anything. A
wrong pair is refused with Twilio's own wording; the token is never returned by
any route.

## Why there can only be one

The record is a single file, sb sms.json, holding one account, one sending
number, one linked phone and one bot id. There is no list to append to:
connecting again replaces the record. Changing the answering bot or replacing the
linked phone rewrites the same record, so no second integration can exist even if
two screens race. It is written atomically with mode 0600, because it holds the
auth token.

| Rule | Where it is enforced |
|---|---|
| One integration | server/twilio/store.ts (one file, one record) |
| One sending number | same record; connect replaces |
| One linked phone | linkNumber refuses a second number unless replace: true |
| One answering bot | designateBot overwrites botId |
| Only the linked phone may text in | SmsService.inbound |
| Only the answering bot may text out | SmsService.turnCompleted checks the thread |
| The first text is sent once | firstMessageAt in the record |

## Inbound

Twilio posts form-encoded callbacks to the **webhook receiver**, not to the
authenticated API: POST https://<public host>/twilio/sms

Set that URL as the number's *Messaging → A message comes in* webhook (HTTP POST).
Paste the exact URL shown in Settings → SMS.

The receiver:

- reads the raw form body and verifies X-Twilio-Signature (HMAC-SHA1 over the
  URL and every field, keyed by the auth token), accepting both the base64 and
  hex encodings. The advertised public URL and the URL that arrived are both
  tried, so a reverse proxy or tunnel does not break the check;
- accepts only a From equal to the linked phone;
- acknowledges with empty TwiML immediately, then runs the bot turn, so a slow
  model never makes Twilio retry;
- remembers MessageSid values, so a Twilio retry is acknowledged without
  answering twice.

## Outbound

The answering bot's turn ends → its newest text message is sent to the linked
phone through the Twilio REST API. Messages are sent one at a time, in order.
Replies up to 1,530 characters go as one concatenated message; longer replies are
split on paragraph, sentence or word boundaries.

A bot that is not the answering bot never sends SMS: its turns are on other
threads, and turnCompleted ignores them. To let another bot contribute, the
answering bot delegates through the normal peer tools and writes the final answer
itself.

## Environment

| Variable | Meaning |
|---|---|
| OMB_WEBHOOK_PUBLIC_URL | The public base URL Twilio should reach (the same one automations advertise). Without it, inbound SMS cannot arrive and Settings → SMS says so. |
| OMB_WEBHOOK_PORT | Port of the webhook receiver (defaults to the app port + 1). |
| OMB_TWILIO_API_URL | Overrides https://api.twilio.com. Tests use it to point at a stub; production should not set it. |

Deployment: expose the webhook receiver through HTTPS (a tunnel, Caddy or a
reverse proxy) and set OMB_WEBHOOK_PUBLIC_URL to that origin. The app's own port
does not need to be public.

## Tests

server/twilio/*.test.ts and server/routes/twilio.test.ts cover signature
verification, the client's validation and error mapping, the singleton rules,
number replacement, the one-time first text, inbound routing and deduplication,
outbound ordering and splitting, and the settings routes. Every Twilio response
in them is mocked; no request leaves the machine.

## Migrations

None. The integration is a new file in the data directory; an installation that
never connects SMS is unchanged.
