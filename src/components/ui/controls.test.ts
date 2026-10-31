import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfirmDialog, Disclosure, Progress, RadioGroup, SearchField, Skeleton, StatusDot, Switch, Tooltip } from ".";

const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("interactive primitives", () => {
  it("keeps switch semantics and the animated knob", () => {
    const html = render(createElement(Switch, { checked: true, "aria-label": "Analytics" }));
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("transition-[left]");
    expect(html).toContain("motion-reduce:transition-none");
  });

  it("groups radios under a legend with a real input each", () => {
    const html = render(createElement(RadioGroup, {
      name: "plan", value: "b", legend: "Plan", onChange: () => {},
      options: [{ value: "a", label: "Free" }, { value: "b", label: "Pro", hint: "Always on" }],
    }));
    expect(html).toContain("<fieldset");
    expect(html).toContain("<legend");
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="plan"');
    expect(html).toContain("peer-focus-visible:outline-2");
  });

  it("reports progress to assistive tech", () => {
    const html = render(createElement(Progress, { value: 2, max: 4, label: "Upload" }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain('aria-valuemax="4"');
    expect(html).toContain("width:50%");
  });

  it("keeps skeletons out of the accessibility tree", () => {
    expect(render(createElement(Skeleton, { className: "h-4" }))).toContain('aria-hidden="true"');
  });

  it("expands a disclosure with aria-expanded and its region", () => {
    const html = render(createElement(Disclosure, { title: "Advanced", open: true, onToggle: () => {}, children: "Body" }));
    expect(html).toContain('aria-expanded="true"');
    expect(html).toMatch(/aria-controls="[^"]+"/);
    expect(html).toContain("rotate-90");
  });

  it("labels the search field and offers a clear control", () => {
    const html = render(createElement(SearchField, { value: "bot", onChange: () => {}, placeholder: "Search", label: "Search bots" }));
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Search bots"');
    expect(html).toContain('aria-label="Clear search"');
  });

  it("builds a confirm dialog on the shared dialog", () => {
    const html = render(createElement(ConfirmDialog, {
      open: true, onClose: () => {}, onConfirm: () => {},
      title: "Delete bot?", description: "This cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", tone: "danger",
    }));
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Delete bot?");
    expect(html).toContain("bg-danger/10");
  });

  it("renders no tooltip bubble until it is opened", () => {
    const closed = render(createElement(Tooltip, { label: "Copy", children: createElement("button", null, "x") }));
    expect(closed).not.toContain('role="tooltip"');
  });
});

describe("status dot", () => {
  it("names the state for assistive tech and animates only while running", () => {
    const running = render(createElement(StatusDot, { state: "running", label: "Running" }));
    expect(running).toContain('role="img"');
    expect(running).toContain('aria-label="Running"');
    expect(running).toContain("animate-ping");
    const done = render(createElement(StatusDot, { state: "done", label: "Completed" }));
    expect(done).not.toContain("animate-ping");
    expect(done).toContain("text-ink-tertiary");
    expect(render(createElement(StatusDot, { state: "failed", label: "Failed" }))).toContain("text-danger");
  });
});
