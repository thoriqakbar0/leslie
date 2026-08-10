import { describe, expect, it } from "vite-plus/test";
import { removeWorkLogEntry, restoreWorkLogEntry, timeScaleRange, timestampOnDate } from "./model";
import type { WorkLogEntry } from "./model";

const firstLog: WorkLogEntry = { id: "log-first", note: "First", createdAt: 100 };
const secondLog: WorkLogEntry = { id: "log-second", note: "Second", createdAt: 200 };
const thirdLog: WorkLogEntry = { id: "log-third", note: "Third", createdAt: 300 };

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
