import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { initialState } from "@/state/store";

vi.mock("@/state/store", async (original) => ({ ...await original<typeof import("@/state/store")>(), useStore: () => ({ state: initialState, dispatch: vi.fn() }) }));

import { APP_FACES, POPULAR_APPS, ConnectAppsPromptRow, appFaces } from "./SidebarConnectApps";
import { everyAppConnected } from "@/lib/connector-status";

const card = (slug: string) => ({ slug, label: slug, logo: `https://logos.example/${slug}.png`, domain: null });

const NATIVE = [
  { slug: "whop", connected: true },
  { slug: "highlevel", connected: true },
  { slug: "x", connected: true },
];

describe("when there is nothing left to connect", () => {
  it("needs a complete, non-empty catalogue and an active, settled connection for every app on it", () => {
    expect(everyAppConnected({}, true, [], NATIVE)).toBe(false);
    expect(everyAppConnected({}, true, null, NATIVE)).toBe(false);
    expect(everyAppConnected({ gmail: { connected: true } }, false, ["gmail"], NATIVE)).toBe(false);
    expect(everyAppConnected({ gmail: { connected: true } }, true, ["gmail", "slack"], NATIVE)).toBe(false);
    expect(everyAppConnected({ gmail: { connected: true }, slack: { connected: true, pending: true } }, true, ["gmail", "slack"], NATIVE)).toBe(false);
    expect(everyAppConnected({
      gmail: { connected: true, accounts: [{ id: "a", status: "ACTIVE" }] },
      slack: { connected: true },
      notion: { connected: true, accounts: [{ id: "b", status: "EXPIRED" }] },
    }, true, ["gmail", "slack", "notion"], NATIVE)).toBe(false);
    expect(everyAppConnected({
      gmail: { connected: true, accounts: [{ id: "a", status: "ACTIVE" }] },
      slack: { connected: true },
    }, true, ["gmail", "slack"], NATIVE)).toBe(true);
  });

  it("does not let the connected-only inventory stand in for the catalogue", () => {
    // Only Gmail is connected, so the endpoint returns only Gmail. Slack and Notion are still to do.
    expect(everyAppConnected({ gmail: { connected: true } }, true, ["gmail", "slack", "notion"], NATIVE)).toBe(false);
  });

  it("keeps the prompt unless every native app is connected too", () => {
    const services = { gmail: { connected: true } };
    expect(everyAppConnected(services, true, ["gmail"], [])).toBe(false);
    expect(everyAppConnected(services, true, ["gmail"], [
      { slug: "whop", connected: false },
      { slug: "highlevel", connected: true },
      { slug: "x", connected: true },
    ])).toBe(false);
    expect(everyAppConnected(services, true, ["gmail"], NATIVE)).toBe(true);
  });
});

describe("the Connect apps faces", () => {
  it("shows popular apps until something is connected", () => {
    expect(appFaces([], new Map()).map((face) => face.slug)).toEqual(POPULAR_APPS.map((app) => app.slug));
  });

  it("puts connected apps first, fills with popular ones, and never shows more than three", () => {
    const cards = new Map([["github", card("github")], ["gmail", card("gmail")]]);
    expect(appFaces(["github", "gmail"], cards).map((face) => face.slug)).toEqual(["github", "gmail", "slack"]);
    const many = new Map(["a", "b", "c", "d"].map((slug) => [slug, card(slug)]));
    expect(appFaces(["a", "b", "c", "d"], many)).toHaveLength(APP_FACES);
  });

  it("keeps a connected app it cannot draw yet out, and the popular ones in", () => {
    expect(appFaces(["linear"], new Map()).map((face) => face.slug)).toEqual(["gmail", "slack", "notion"]);
  });
});

describe("the Connect apps prompt row", () => {
  it("is a 36px full-width row with a 14px label, three 18px faces and a 24px dismiss", () => {
    const html = renderToStaticMarkup(createElement(ConnectAppsPromptRow, {
      faces: POPULAR_APPS, open: false, onOpen: () => {}, onDismiss: () => {},
    }));
    expect(html).toContain('data-connect-apps-pill');
    expect(html).toMatch(/class="group\/apps flex h-9 w-full items-center gap-2 rounded-full bg-menu ps-3 pe-1 ring-1 ring-hairline"/);
    expect(html).toContain('text-[14px] font-medium leading-5 text-ink');
    expect(html).toContain('data-connect-apps-dismiss');
    expect(html).toContain('aria-label="Hide Connect apps"');
    const faces = [...html.matchAll(/data-app-face="[^"]+" class="([^"]*)"/g)].map(([, classes]) => classes!);
    expect(faces).toHaveLength(3);
    for (const face of faces) expect(face).toContain("size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-px");
    expect(faces[0]).toContain("motion-safe:group-hover/apps:-rotate-[8deg]");
    expect(faces[1]).toContain("-ms-1.5");
    expect(faces[2]).toContain("motion-safe:group-hover/apps:translate-x-[3px] motion-safe:group-hover/apps:rotate-[8deg]");
  });

  it("is a prompt, not the footer's Apps squircle", () => {
    const html = renderToStaticMarkup(createElement(ConnectAppsPromptRow, {
      faces: POPULAR_APPS, open: false, onOpen: () => {},
    }));
    expect(html).not.toContain("size-9");
    expect(html).not.toContain("lucide-puzzle");
    expect(html).not.toContain("data-connect-apps-dismiss");
  });
});
