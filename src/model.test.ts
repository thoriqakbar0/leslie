import { describe, expect, it } from "vite-plus/test";
import {
  completePlannedClock,
  formatClockTime,
  formatEntryTime,
  parsePlannedInput,
  removeWorkLogEntry,
  restoreWorkLogEntry,
  timeScaleHeading,
  timeScaleRange,
  timestampOnDate,
} from "./model";
import type { WorkLogEntry } from "./model";

const firstLog: WorkLogEntry = { id: "log-first", note: "First", createdAt: 100 };
const secondLog: WorkLogEntry = { id: "log-second", note: "Second", createdAt: 200 };
const thirdLog: WorkLogEntry = { id: "log-third", note: "Third", createdAt: 300 };

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
    expect(parsePlannedInput("Send invoice in about 30 minutes", 15)).toEqual({
      title: "Send invoice",
      estimatedMinutes: 30,
    });
    expect(parsePlannedInput("Draft summary for half an hour", 15)).toEqual({
      title: "Draft summary",
      estimatedMinutes: 30,
    });
    expect(parsePlannedInput("Deep work for two hours", 15)).toEqual({
      title: "Deep work",
      estimatedMinutes: 120,
    });
  });
});

describe("time formatting", () => {
  const evening = new Date(2026, 7, 10, 18, 5, 7);

  it("uses 24-hour time for work-log entries", () => {
    expect(formatEntryTime(evening.getTime())).toBe("18:05");
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
