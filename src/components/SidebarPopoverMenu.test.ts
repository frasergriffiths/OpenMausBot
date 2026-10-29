import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

// Drawn open: the menu's own motion and dismissal are not what is tested here.
vi.mock("./MenuMotion", () => ({ useMenuMotion: () => ({ shown: true, exitProps: {}, className: "" }) }));
vi.mock("@/hooks/use-popover-dismiss", () => ({ usePopoverDismiss: () => {} }));
// Simple mode draws the compact anchored look; that is where a noted row used to overflow.
vi.mock("@/lib/interface-mode", () => ({ useAdvancedMode: () => false }));
import { MenuRows, SidebarPopoverMenu } from "./SidebarPopoverMenu";

// The inline "below" sheet; the anchored "above" one renders in a portal and is driven in a DOM elsewhere.
const render = (items: Parameters<typeof SidebarPopoverMenu>[0]["items"], compact = false) =>
  renderToStaticMarkup(createElement(SidebarPopoverMenu, { items, ariaLabel: "Menu", placement: "below", compact, renderTrigger: () => "trigger" }));

it("draws an item's second line (where it connects) and third line (a note) under its label", () => {
  const html = render([
    { key: "cloud", label: "Connect your phone", subtitle: "to your Cloud (always on)", onSelect: () => {} },
    { key: "here", label: "Connect your phone", subtitle: "to this computer", note: "Your Cloud shows here once it is ready.", onSelect: () => {} },
    { key: "plain", label: "Settings", onSelect: () => {} },
  ]);
  expect(html).toMatch(/Connect your phone<\/span><span[^>]*>to your Cloud \(always on\)<\/span>/);
  expect(html).toMatch(/to this computer<\/span><span[^>]*>Your Cloud shows here once it is ready\.<\/span>/);
  expect(html.indexOf("to your Cloud (always on)")).toBeLessThan(html.indexOf("to this computer"));
  expect(html).toContain('<span class="flex-1 truncate">Settings</span>');
});

it("grows a compact row that carries a note, and leaves a single-line row at 30px", () => {
  const draw = (items: Parameters<typeof MenuRows>[0]["items"]) =>
    renderToStaticMarkup(createElement(MenuRows, { items, look: "compact", onItem: () => {} }));
  const noted = draw([{ key: "approve", label: "Approve each change", note: "Asks before it edits anything.", onSelect: () => {} }]);
  expect(noted).toContain("min-h-[30px]");
  expect(noted).toContain("py-1");
  expect(noted).toContain("items-start");
  expect(noted).toContain("line-clamp-2");
  expect(noted).not.toContain(" h-[30px]");
  const flat = draw([{ key: "settings", label: "Settings", onSelect: () => {} }]);
  expect(flat).toContain(" h-[30px]");
  expect(flat).not.toContain("min-h-[30px]");
});

it("draws an item's attention dot on the item itself, in its tone", () => {  const html = render([
    { key: "ready", label: "Restart to update", attention: true, attentionTone: "accent", onSelect: () => {} },
    { key: "failed", label: "Update failed", attention: true, onSelect: () => {} },
    { key: "plain", label: "Settings", onSelect: () => {} },
  ]);
  const item = (label: string) => html.split('role="menuitem"').find((chunk) => chunk.includes(`>${label}</span>`)) ?? "";
  expect(item("Restart to update")).toContain("rounded-full bg-accent");
  expect(item("Update failed")).toContain("rounded-full bg-danger");
  expect(item("Settings")).not.toMatch(/rounded-full bg-(accent|danger)/);
  expect(html.split('role="menu"')[0]).not.toMatch(/rounded-full bg-(accent|danger)/);
});

it("paints a destructive item's label and glyph in the danger colour", () => {
  const html = render([
    { key: "delete", label: "Delete", danger: true, icon: createElement("svg"), onSelect: () => {} },
    { key: "archive", label: "Archive", onSelect: () => {} },
  ]);
  const destructive = html.slice(html.indexOf('data-menu-key="delete"'), html.indexOf(">Delete</span>"));
  expect(destructive.match(/text-danger/g)).toHaveLength(2);
  expect(html.slice(html.indexOf('data-menu-key="archive"'))).not.toContain("text-danger");
});
