import { createElement } from "react";
import { beforeAll } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/state/store", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/state/store")>(),
  useStore: () => ({ state: { bots: [], groups: [], instances: [], config: {} }, dispatch: vi.fn() }),
}));

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window = globalThis;
});

const { TeamMapPage } = await import("./TeamMapPage");

describe("the Team Map title", () => {
  it("is the title alone, without a person icon before it", () => {
    const html = renderToStaticMarkup(createElement(TeamMapPage));
    const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
    expect(heading).not.toBeNull();
    expect(heading![1]).not.toContain("<svg");
  });
});
