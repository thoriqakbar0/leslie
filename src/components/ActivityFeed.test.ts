import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { ActivityFeed } from "./ActivityFeed";
import type { ActivityHistoryEntry, PlannedItem, WorkLogEntry } from "../model";

const task: PlannedItem = {
  id: "task-one",
  listId: "inbox",
  title: "Send the invoice",
  notes: "Send before lunch.",
  estimatedMinutes: 30,
  scheduledAt: new Date(2026, 7, 10, 14, 0).getTime(),
};

const log: WorkLogEntry = {
  id: "log-one",
  note: "Reviewed the invoice.",
  notes: "Follow up tomorrow.",
  createdAt: 200,
};

function renderFeed(
  tasks: readonly PlannedItem[],
  workLog: readonly WorkLogEntry[],
  playback: { readonly isPlaying: boolean; readonly playingTaskId: string | null } = {
    isPlaying: false,
    playingTaskId: null,
  },
  history: readonly ActivityHistoryEntry[] = [],
) {
  return renderToStaticMarkup(
    createElement(ActivityFeed, {
      activeListName: "Inbox",
      history,
      isPlaying: playback.isPlaying,
      playingTaskId: playback.playingTaskId,
      tasks,
      timeScale: "day",
      workLog,
      onComplete: () => undefined,
      onEstimateChange: () => undefined,
      onOpenTaskNotes: () => undefined,
      onOpenWorkLogNotes: () => undefined,
      onRemoveTask: () => undefined,
      onRemoveWorkLog: () => undefined,
      onTaskTitleChange: () => undefined,
      onTogglePlaying: () => undefined,
      onWorkLogTitleChange: () => undefined,
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
    expect(html).toContain("Planned");
    expect(html).toContain("14:00</time>");
    expect(html).toContain('aria-label="Playback for Send the invoice"');
    expect(html).toContain('aria-describedby="task-metadata-task-one playback-action-hint"');
    expect(html).toContain("Press to switch between playing and paused.");
    expect(html).toContain("Opens notes for this activity. Press E to edit its title.");
    expect(html).toContain('aria-describedby="task-metadata-task-one activity-notes-action-hint"');
    expect(html).toContain('aria-keyshortcuts="j k"');
    expect(html).toContain('data-activity-card="task:task-one"');
    expect(html).toContain('data-activity-navigation-target=""');
    expect(html).toContain('data-notes-trigger="task:task-one"');
    expect(html).toContain('aria-keyshortcuts="Enter E"');
    expect(html).toContain('aria-labelledby="task-title-task-one"');
    expect(html).toContain('aria-describedby="task-metadata-task-one"');
    expect(html).toContain('<h2 id="planned-section-title">Planned</h2>');
    expect(html).toContain('<h2 id="did-section-title">Did</h2>');
    expect(html).toContain('<h3 class="task-title-line" id="task-title-task-one">');
    expect(html).toContain(">Send the invoice</button>");
    expect(html).toContain("Expected<span");
    expect(html).toContain("<kbd>j</kbd>/<kbd>k</kbd> move");
    expect(html).not.toContain(">Notes</button>");
  });

  it("announces the active task state with text", () => {
    const html = renderFeed([task], [], { isPlaying: true, playingTaskId: task.id });

    expect(html).toContain("Working now");
    expect(html).toContain('aria-label="Playback for Send the invoice"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("is-current is-playing");
  });

  it("renders at-labels separately from entry text", () => {
    const labeledTask = { ...task, title: "Send the invoice @work @urgent" };
    const labeledLog = { ...log, note: "Reviewed the invoice @work" };
    const html = renderFeed([labeledTask], [labeledLog]);

    expect(html).toContain(">Send the invoice</button>");
    expect(html).toContain('aria-label="Labels"');
    expect(html).toContain("<li>@work</li>");
    expect(html).toContain("<li>@urgent</li>");
    expect(html).not.toContain(">Send the invoice @work @urgent</button>");
  });

  it("shows dates and sorting for completed work", () => {
    const laterLog = { ...log, id: "log-two", note: "Sent the invoice.", createdAt: 400 };
    const html = renderFeed([], [log, laterLog]);

    expect(html).toContain(
      'aria-label="Sort completed work. Newest first. Switch to oldest first"',
    );
    expect(html).toContain('title="Newest first"');
    expect(html).not.toContain("<select");
    expect(html).toContain('class="log-date"');
    expect(html.indexOf("Sent the invoice.")).toBeLessThan(html.indexOf("Reviewed the invoice."));
  });

  it("makes completed work part of keyboard notes navigation", () => {
    const html = renderFeed([], [log]);

    expect(html).toContain('aria-keyshortcuts="j k"');
    expect(html).toContain('data-activity-card="log:log-one"');
    expect(html).toContain('data-activity-navigation-target=""');
    expect(html).toContain('data-notes-trigger="log:log-one"');
    expect(html).toContain('aria-keyshortcuts="Enter E"');
    expect(html).toContain('aria-describedby="log-metadata-log-one activity-notes-action-hint"');
    expect(html).toContain('id="log-title-log-one"');
    expect(html).toContain(">Reviewed the invoice.</button>");
  });

  it("renders a chronological history timeline", () => {
    const history: readonly ActivityHistoryEntry[] = [
      {
        id: "history-old",
        itemId: task.id,
        type: "planned-created",
        title: task.title,
        occurredAt: 300,
      },
      {
        id: "history-new",
        itemId: task.id,
        itemKind: "planned",
        type: "title-changed",
        previousTitle: "Draft the invoice",
        title: task.title,
        occurredAt: 400,
      },
    ];
    const html = renderFeed([task], [], undefined, history);

    expect(html).toContain(
      '<section aria-labelledby="history-section-title" class="history-panel">',
    );
    expect(html).toContain("2 changes");
    expect(html).toContain("Renamed planned from “Draft the invoice” to “Send the invoice”");
    expect(html.indexOf("Renamed planned")).toBeLessThan(
      html.indexOf("Planned “Send the invoice”"),
    );
  });
});
