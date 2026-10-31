// @vitest-environment happy-dom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/state/store", () => ({ api: request }));
import { TeamMemoryDialog } from "./TeamMemoryDialog";

let root: Root;
let host: HTMLDivElement;
const entry = { id: "note", kind: "decision", name: "Colour", detail: "Green", aliases: [], status: "accepted", revision: "revision-one",
  source: { botId: "b", botName: "Editor", threadId: "t", at: 1 }, updatedAt: 1 };
beforeEach(() => {
  request.mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => { flushSync(() => root.unmount()); host.remove(); });
async function render() {
  flushSync(() => root.render(createElement(TeamMemoryDialog, { section: "Editing", label: "Editing", onClose: () => undefined })));
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Colour detail"]')).not.toBeNull());
}

it("keeps the user's unsaved text after a conflict and reloads the latest version", async () => {
  let reads = 0;
  request.mockImplementation(async (_path: string, init?: RequestInit) => {
    if (init?.method === "PATCH") throw new Error("This department memory changed. Reload it before saving or approving.");
    reads++;
    return { entries: [{ ...entry, ...(reads > 1 ? { detail: "Amber", revision: "revision-two" } : {}) }], loadedIds: [entry.id] };
  });
  await render();
  const field = document.querySelector<HTMLInputElement>('[aria-label="Colour detail"]')!;
  field.value = "My unsaved orange treatment";
  flushSync(() => field.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
  await vi.waitFor(() => expect(document.body.textContent).toContain("Your unsaved draft: My unsaved orange treatment"));
  const sent = request.mock.calls.find(([, init]) => init?.method === "PATCH")!;
  expect(JSON.parse(sent[1].body)).toEqual({ detail: "My unsaved orange treatment", expectedRevision: "revision-one" });
  const reload = [...document.querySelectorAll("button")].find(button => button.textContent === "Reload latest")!;
  flushSync(() => reload.click());
  await vi.waitFor(() => expect(document.querySelector<HTMLInputElement>('[aria-label="Colour detail"]')!.value).toBe("Amber"));
  expect(document.body.textContent).toContain("Your unsaved draft: My unsaved orange treatment");
});

it("shows omitted notes as searchable and sends a revision when pinning", async () => {
  request.mockResolvedValue({ entries: [entry], loadedIds: [] });
  await render();
  expect(document.body.textContent).toContain("0 of 1 accepted notes load automatically");
  expect(document.body.textContent).toContain("Searchable");
  flushSync(() => document.querySelector<HTMLButtonElement>('[aria-label="Pin Colour"]')!.click());
  await vi.waitFor(() => expect(request.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true));
  expect(JSON.parse(request.mock.calls.find(([, init]) => init?.method === "PATCH")![1].body)).toEqual({ pinned: true, expectedRevision: "revision-one" });
});

it("re-enables controls after refreshing a response without capacity data", async () => {
  let pinned = false;
  request.mockImplementation(async (_path: string, init?: RequestInit) => {
    if (init?.method === "PATCH") { pinned = true; return { entries: [{ ...entry, pinned }] }; }
    return { entries: [{ ...entry, pinned }], loadedIds: [entry.id] };
  });
  await render();
  flushSync(() => document.querySelector<HTMLButtonElement>('[aria-label="Pin Colour"]')!.click());
  await vi.waitFor(() => expect(request.mock.calls.length).toBe(3));
  await vi.waitFor(() => expect(document.querySelector<HTMLButtonElement>('[aria-label="Remove Colour"]')!.disabled).toBe(false));
});


it("retains one entry's failed draft when another entry saves successfully", async () => {
  const other = { ...entry, id: "other", name: "Audio" };
  request.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === "PATCH" && path.includes("/note?")) throw new Error("conflict");
    return { entries: [entry, other], loadedIds: [entry.id, other.id] };
  });
  await render();
  const field = document.querySelector<HTMLInputElement>('[aria-label="Colour detail"]')!;
  field.value = "Keep my orange draft";
  flushSync(() => field.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
  await vi.waitFor(() => expect(document.body.textContent).toContain("Keep my orange draft"));
  const audio = document.querySelector<HTMLInputElement>('[aria-label="Audio detail"]')!;
  audio.value = "Quiet soundtrack";
  flushSync(() => audio.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
  await vi.waitFor(() => expect(request.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(2));
  await vi.waitFor(() => expect(document.querySelector<HTMLButtonElement>('[aria-label="Remove Audio"]')!.disabled).toBe(false));
  expect(document.body.textContent).toContain("Keep my orange draft");
});


it("restores a historical name even when its detail is unchanged", async () => {
  request.mockResolvedValue({ entries: [{ ...entry, history: [{ name: "Earlier colour", detail: entry.detail, at: 1 }] }], loadedIds: [entry.id] });
  await render();
  flushSync(() => [...document.querySelectorAll("button")].find(button => button.textContent === "Restore text")!.click());
  await vi.waitFor(() => expect(request.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true));
  expect(JSON.parse(request.mock.calls.find(([, init]) => init?.method === "PATCH")![1].body))
    .toEqual({ name: "Earlier colour", detail: entry.detail, expectedRevision: entry.revision });
});

it("offers every department once there is more than one, and moves to the one picked", async () => {
  request.mockImplementation(async () => ({ entries: [], loadedIds: [] }));
  const picked: Array<[string, string]> = [];
  flushSync(() => root.render(createElement(TeamMemoryDialog, {
    section: "Editing",
    label: "Editing",
    onClose: () => undefined,
    picker: {
      sections: [{ key: "Editing", name: "Editing" }, { key: "Research", name: "Research" }],
      onPick: (key: string, name: string) => { picked.push([key, name]); },
    },
  })));
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Departments"]')).not.toBeNull());
  const select = document.querySelector<HTMLSelectElement>('[aria-label="Departments"]')!;
  expect([...select.options].map((option) => option.value)).toEqual(["Editing", "Research"]);
  flushSync(() => {
    select.value = "Research";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(picked).toEqual([["Research", "Research"]]);
});

it("keeps the picker out of the way when the installation has one department", async () => {
  request.mockImplementation(async () => ({ entries: [], loadedIds: [] }));
  flushSync(() => root.render(createElement(TeamMemoryDialog, {
    section: "General",
    label: "General",
    onClose: () => undefined,
    picker: { sections: [{ key: "", name: "General" }], onPick: () => undefined },
  })));
  await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
  expect(document.querySelector('[aria-label="Departments"]')).toBeNull();
  // The shared dialog, not a hand-rolled one: one title, one description, one close button.
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(document.querySelector('[role="dialog"]')?.getAttribute("aria-modal")).toBe("true");
});
