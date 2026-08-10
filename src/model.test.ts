import { describe, expect, it } from "vite-plus/test";
import {
  completePlannedClock,
  formatClockTime,
  formatCompactTime,
  parsePlannedDuration,
  plannedItemsInRange,
  removeWorkLogEntry,
  restoreWorkLogEntry,
  timeScaleHeading,
  timeScaleRange,
  timestampOnDate,
} from "./model";
import type { WorkLogEntry } from "./model";

const firstLog: WorkLogEntry = { id: "log-first", note: "First", notes: "", createdAt: 100 };
const secondLog: WorkLogEntry = { id: "log-second", note: "Second", notes: "", createdAt: 200 };
const thirdLog: WorkLogEntry = { id: "log-third", note: "Third", notes: "", createdAt: 300 };

describe("planned input", () => {
  it("completes a trailing clock hour and selects its minutes", () => {
    expect(completePlannedClock("Call Alex at 8:")).toEqual({
      value: "Call Alex at 08:00",
      selectionStart: 16,
      selectionEnd: 18,
    });
    expect(completePlannedClock("Review at 18:")).toEqual({
      value: "Review at 18:00",
      selectionStart: 13,
      selectionEnd: 15,
    });
    expect(completePlannedClock("Review at 24:")).toBeNull();
  });

  it("accepts natural-language time estimates", () => {
    expect(parsePlannedDuration("Send invoice in about 30 minutes", 15)).toEqual({
      title: "Send invoice",
      estimatedMinutes: 30,
    });
    expect(parsePlannedDuration("Draft summary for half an hour", 15)).toEqual({
      title: "Draft summary",
      estimatedMinutes: 30,
    });
    expect(parsePlannedDuration("Deep work for two hours", 15)).toEqual({
      title: "Deep work",
      estimatedMinutes: 120,
    });
  });
});

describe("time formatting", () => {
  const evening = new Date(2026, 7, 10, 18, 5, 7);

  it("uses 24-hour time for work-log entries", () => {
    expect(formatCompactTime(evening.getTime())).toBe("18:05");
  });

  it("uses 24-hour time with seconds for the live clock", () => {
    expect(formatClockTime(evening)).toBe("18:05:07");
  });
});

describe("timeScaleRange", () => {
  it("returns one selected local day", () => {
    const anchor = new Date(2026, 7, 10, 14, 30);
    const [start, end] = timeScaleRange("day", anchor);

    expect(start).toBe(new Date(2026, 7, 10).getTime());
    expect(end).toBe(new Date(2026, 7, 11).getTime());
  });

  it("returns the monday through sunday range", () => {
    const anchor = new Date(2026, 7, 12, 14, 30);
    const [start, end] = timeScaleRange("week", anchor);

    expect(start).toBe(new Date(2026, 7, 10).getTime());
    expect(end).toBe(new Date(2026, 7, 17).getTime());
  });

  it("returns one selected local month", () => {
    const anchor = new Date(2026, 7, 12, 14, 30);
    const [start, end] = timeScaleRange("month", anchor);

    expect(start).toBe(new Date(2026, 7, 1).getTime());
    expect(end).toBe(new Date(2026, 8, 1).getTime());
  });
});

describe("plannedItemsInRange", () => {
  const start = new Date(2026, 7, 10).getTime();
  const nextDay = new Date(2026, 7, 11).getTime();
  const tasks = [
    {
      id: "at-start",
      listId: "inbox",
      title: "At start",
      notes: "",
      estimatedMinutes: 30 as const,
      scheduledAt: start,
    },
    {
      id: "before-end",
      listId: "inbox",
      title: "Before end",
      notes: "",
      estimatedMinutes: 30 as const,
      scheduledAt: nextDay - 1,
    },
    {
      id: "at-end",
      listId: "inbox",
      title: "At end",
      notes: "",
      estimatedMinutes: 30 as const,
      scheduledAt: nextDay,
    },
    {
      id: "other-list",
      listId: "work",
      title: "Other list",
      notes: "",
      estimatedMinutes: 30 as const,
      scheduledAt: start,
    },
  ];

  it("includes the start and excludes the end of a selected day", () => {
    expect(plannedItemsInRange(tasks, "inbox", "day", new Date(2026, 7, 10))).toEqual([
      tasks[0],
      tasks[1],
    ]);
  });

  it("uses week and month calendar boundaries", () => {
    expect(plannedItemsInRange(tasks, "inbox", "week", new Date(2026, 7, 12))).toEqual([
      tasks[0],
      tasks[1],
      tasks[2],
    ]);
    expect(plannedItemsInRange(tasks, "inbox", "month", new Date(2026, 7, 20))).toEqual([
      tasks[0],
      tasks[1],
      tasks[2],
    ]);
  });
});

describe("timeScaleHeading", () => {
  const today = new Date(2026, 7, 10, 14, 30);

  it("labels nearby selected days relative to today", () => {
    expect(timeScaleHeading("day", new Date(2026, 7, 10), today)).toBe("Today");
    expect(timeScaleHeading("day", new Date(2026, 7, 11), today)).toBe("Tomorrow");
    expect(timeScaleHeading("day", new Date(2026, 7, 9), today)).toBe("Yesterday");
  });

  it("uses the weekday for other selected days", () => {
    expect(timeScaleHeading("day", new Date(2026, 7, 12), today)).toBe("Wednesday");
  });

  it("distinguishes the same weekday in the next week", () => {
    expect(timeScaleHeading("day", new Date(2026, 7, 17), today)).toBe("Next Monday");
  });
});

describe("timestampOnDate", () => {
  it("uses the selected date with the current local time", () => {
    const date = new Date(2026, 7, 10, 2, 0);
    const time = new Date(2030, 1, 3, 16, 42, 18, 250);

    expect(timestampOnDate(date, time)).toBe(new Date(2026, 7, 10, 16, 42, 18, 250).getTime());
  });
});

describe("work-log removal", () => {
  it("removes the requested entry and returns it for undo", () => {
    expect(removeWorkLogEntry([thirdLog, secondLog, firstLog], "log-second")).toEqual({
      workLog: [thirdLog, firstLog],
      removed: secondLog,
    });
  });

  it("does not change the log when the requested entry is missing", () => {
    expect(removeWorkLogEntry([thirdLog, secondLog, firstLog], "log-missing")).toBeNull();
  });

  it("restores an entry in reverse chronological order", () => {
    expect(restoreWorkLogEntry([thirdLog, firstLog], secondLog)).toEqual([
      thirdLog,
      secondLog,
      firstLog,
    ]);
  });
});
