import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { ActivityFeed } from "./ActivityFeed";
import type { PlannedItem, WorkLogEntry } from "../model";

const task: PlannedItem = {
  id: "task-one",
  listId: "inbox",
  title: "Send the invoice",
  estimatedMinutes: 30,
  createdAt: 100,
};

const log: WorkLogEntry = {
  id: "log-one",
  note: "Reviewed the invoice.",
  createdAt: 200,
};

function renderFeed(tasks: readonly PlannedItem[], workLog: readonly WorkLogEntry[]) {
  return renderToStaticMarkup(
    createElement(ActivityFeed, {
      activeListName: "Inbox",
      tasks,
      timeScale: "day",
      workLog,
      onComplete: () => undefined,
      onEstimateChange: () => undefined,
      onRemoveTask: () => undefined,
      onRemoveWorkLog: () => undefined,
    }),
  );
}

describe("ActivityFeed empty states", () => {
  it("shows one calm prompt when the complete feed is empty", () => {
    const html = renderFeed([], []);

    expect(html).toContain("Nothing here yet.");
    expect(html).toContain("Use Did or Planned above when you want to add something.");
    expect(html).not.toContain("No planned items");
  });

  it("names the selected list when only planned work is empty", () => {
    const html = renderFeed([], [log]);

    expect(html).toContain("No planned items in Inbox.");
    expect(html).toContain("Reviewed the invoice.");
  });

  it("names the selected range when only the work log is empty", () => {
    const html = renderFeed([task], []);

    expect(html).toContain("No work recorded for this day.");
    expect(html).toContain("Send the invoice");
  });
});
