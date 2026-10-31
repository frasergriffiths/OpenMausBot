import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button, Checkbox, Dialog, Field, Input, Tabs } from ".";

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("shared ui primitives", () => {
  it("gives buttons variants, sizes and a busy state", () => {
    const html = render(createElement(Button, { variant: "primary", size: "sm", loading: true }, "Save"));
    expect(html).toContain("bg-accent");
    expect(html).toContain("h-8");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("motion-reduce:animate-none");
  });

  it("draws a custom checkbox over a real input the keyboard can reach", () => {
    const html = render(
      createElement(Checkbox, { checked: true, label: "Allow edits", hint: "Members can change files", onChange: () => {} }),
    );
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("checked");
    expect(html).toContain("peer-focus-visible:outline-2");
    expect(html).toContain("border-accent bg-accent");
    expect(html).toContain("<label class=");
    expect(html).toContain("Allow edits");
  });

  it("keeps the tick out of the accessibility tree and hidden when unchecked", () => {
    const html = render(createElement(Checkbox, { checked: false, label: "Off", onChange: () => {} }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("scale-50 opacity-0");
    expect(html).not.toContain("border-accent bg-accent");
  });

  it("ties a field label to its input and shows errors as alerts", () => {
    const html = render(
      createElement(Field, { label: "Name", error: "Required" }, createElement(Input, { name: "name" })),
    );
    expect(html).toMatch(/<label[^>]*for="[^"]+"/);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Required");
  });

  it("exposes tabs with roving focus and a selected state", () => {
    const html = render(
      createElement(Tabs, {
        ariaLabel: "Sections",
        active: "b",
        onChange: () => {},
        items: [
          { id: "a", label: "One" },
          { id: "b", label: "Two" },
        ],
      }),
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("bg-ink/[0.09]");
  });

  it("renders nothing while a dialog is closed and a labelled modal when open", () => {
    expect(render(createElement(Dialog, { open: false, onClose: () => {}, title: "Defaults" }))).toBe("");
    const html = render(
      createElement(Dialog, { open: true, onClose: () => {}, title: "Defaults", description: "New bots" }, "Body"),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("New bots");
    expect(html).toContain("animate-pop-in");
  });
});
