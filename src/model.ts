/** The supported expected-time values for a planned item. */
export type EstimateMinutes = 15 | 30 | 60 | 120 | 240 | 480;

/** The capture mode for a new stream item. */
export type EntryMode = "did" | "planned";

/** The selected activity range. */
export type TimeScale = "day" | "week" | "month";

/** A named list that owns planned items. */
export interface TaskList {
  readonly id: string;
  readonly name: string;
}

/** An item that the user plans to do. */
export interface PlannedItem {
  readonly id: string;
  readonly listId: string;
  readonly title: string;
  readonly notes: string;
  readonly estimatedMinutes: EstimateMinutes;
  readonly scheduledAt: number;
}

/** A record of work that the user did. */
export interface WorkLogEntry {
  readonly id: string;
  readonly listId: string;
  readonly note: string;
  readonly notes: string;
  readonly origin: "direct" | "planned";
  readonly createdAt: number;
}

interface ActivityHistoryBase {
  readonly id: string;
  readonly itemId: string;
  readonly occurredAt: number;
  readonly title: string;
}

/** A durable record of a user-visible activity change. */
export type ActivityHistoryEntry =
  | (ActivityHistoryBase & { readonly type: "planned-created" })
  | (ActivityHistoryBase & { readonly type: "did-created" })
  | (ActivityHistoryBase & { readonly type: "planned-completed" })
  | (ActivityHistoryBase & {
      readonly type: "title-changed";
      readonly itemKind: "planned" | "did";
      readonly previousTitle: string;
    });

/** The complete local Leslie document. */
export interface LeslieState {
  readonly lists: readonly TaskList[];
  readonly activeListId: string;
  readonly tasks: readonly PlannedItem[];
  readonly workLog: readonly WorkLogEntry[];
  readonly history: readonly ActivityHistoryEntry[];
}

/** All supported expected-time values, in display order. */
export const ESTIMATE_OPTIONS: readonly EstimateMinutes[] = [15, 30, 60, 120, 240, 480];

const initialLists: readonly TaskList[] = [
  { id: "inbox", name: "Inbox" },
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
  { id: "someday", name: "Someday" },
];

const compactTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const clockTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const weekRangeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function todayAt(now: Date, hours: number, minutes: number): number {
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

/** Create the initial local document for a first Leslie launch. */
export function createInitialState(now = new Date()): LeslieState {
  const scheduledAt = now.getTime();
  return {
    lists: initialLists,
    activeListId: "inbox",
    tasks: [
      {
        id: "task-invoice",
        listId: "inbox",
        title: "Send the invoice",
        notes: "",
        estimatedMinutes: 30,
        scheduledAt,
      },
      {
        id: "task-alex",
        listId: "inbox",
        title: "Reply to Alex",
        notes: "",
        estimatedMinutes: 15,
        scheduledAt,
      },
      {
        id: "task-dentist",
        listId: "inbox",
        title: "Book dentist appointment",
        notes: "",
        estimatedMinutes: 30,
        scheduledAt,
      },
      {
        id: "task-meeting",
        listId: "work",
        title: "Prepare meeting notes",
        notes: "",
        estimatedMinutes: 60,
        scheduledAt,
      },
      {
        id: "task-plants",
        listId: "personal",
        title: "Water the plants",
        notes: "",
        estimatedMinutes: 15,
        scheduledAt,
      },
      {
        id: "task-receipts",
        listId: "someday",
        title: "Sort travel receipts",
        notes: "",
        estimatedMinutes: 120,
        scheduledAt,
      },
    ],
    workLog: [
      {
        id: "log-details",
        listId: "inbox",
        note: "Reviewed the invoice details.",
        notes: "",
        origin: "direct",
        createdAt: todayAt(now, 10, 42),
      },
      {
        id: "log-template",
        listId: "inbox",
        note: "Opened the invoice template.",
        notes: "",
        origin: "direct",
        createdAt: todayAt(now, 10, 25),
      },
      {
        id: "log-source",
        listId: "inbox",
        note: "Found the last invoice.",
        notes: "",
        origin: "direct",
        createdAt: todayAt(now, 9, 58),
      },
    ],
    history: [],
  };
}

/** Remove one work-log entry while returning the exact entry for undo. */
export function removeWorkLogEntry(
  workLog: readonly WorkLogEntry[],
  id: string,
): { readonly workLog: readonly WorkLogEntry[]; readonly removed: WorkLogEntry } | null {
  const removed = workLog.find((entry) => entry.id === id);
  if (!removed) return null;
  return {
    workLog: workLog.filter((entry) => entry.id !== id),
    removed,
  };
}

/** Restore a removed work-log entry in reverse chronological order. */
export function restoreWorkLogEntry(
  workLog: readonly WorkLogEntry[],
  entry: WorkLogEntry,
): readonly WorkLogEntry[] {
  return [...workLog, entry].sort((left, right) => right.createdAt - left.createdAt);
}

/** Apply a 24-hour clock value to the local calendar date of a timestamp. */
export function timestampAtClockTime(timestamp: number, clockTime: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clockTime);
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || match === null) return null;
  const date = new Date(timestamp);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  const result = date.getTime();
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}

/** Parse an expected-time form value. */
export function parseEstimate(value: string): EstimateMinutes | null {
  switch (Number(value)) {
    case 15:
      return 15;
    case 30:
      return 30;
    case 60:
      return 60;
    case 120:
      return 120;
    case 240:
      return 240;
    case 480:
      return 480;
    default:
      return null;
  }
}

/** Parse a time-scale form value. */
export function parseTimeScale(value: string): TimeScale | null {
  if (value === "day" || value === "week" || value === "month") return value;
  return null;
}

/** Complete a trailing clock-hour prefix and select its minutes for direct replacement. */
export function completePlannedClock(value: string): {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
} | null {
  const clockPrefix = value.match(/(?:^|\s)([01]?\d|2[0-3]):$/);
  if (!clockPrefix) return null;

  const hour = clockPrefix[1];
  if (hour === undefined) return null;
  const hourStart = value.length - hour.length - 1;
  const completedValue = `${value.slice(0, hourStart)}${hour.padStart(2, "0")}:00`;
  const selectionStart = hourStart + 3;
  return {
    value: completedValue,
    selectionStart,
    selectionEnd: selectionStart + 2,
  };
}

/** Extract a supported duration from the end of natural-language task text. */
export function parsePlannedDuration(
  value: string,
  fallbackMinutes: EstimateMinutes,
): { readonly title: string; readonly estimatedMinutes: EstimateMinutes } {
  const halfHour = value.match(/\s+(?:(?:for|in)\s+)?(?:about\s+)?half(?:\s+an?)?\s+hour\s*$/i);
  const cleanValue = value.trim();
  if (halfHour) {
    const title = value.slice(0, halfHour.index).trim();
    return { title: title || cleanValue, estimatedMinutes: 30 };
  }

  const duration = value.match(
    /\s+(?:(?:for|in)\s+)?(?:about\s+)?(15|30|60|1|2|4|8|an?|one|two|four|eight)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\s*$/i,
  );
  if (!duration) return { title: cleanValue, estimatedMinutes: fallbackMinutes };

  const amountText = duration[1]?.toLowerCase() ?? "";
  const wordAmounts: Readonly<Record<string, number>> = {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    four: 4,
    eight: 8,
  };
  const amount = wordAmounts[amountText] ?? Number(amountText);
  const unit = duration[2]?.toLowerCase() ?? "";
  const parsedMinutes = parseEstimate(String(unit.startsWith("h") ? amount * 60 : amount));
  if (parsedMinutes === null) return { title: cleanValue, estimatedMinutes: fallbackMinutes };

  const title = value.slice(0, duration.index).trim();
  return { title: title || cleanValue, estimatedMinutes: parsedMinutes };
}

/** Return planned items in one list and selected calendar range. */
export function plannedItemsInRange(
  tasks: readonly PlannedItem[],
  listId: string,
  scale: TimeScale,
  anchor: Date,
): readonly PlannedItem[] {
  const [start, end] = timeScaleRange(scale, anchor);
  return tasks.filter(
    (task) => task.listId === listId && task.scheduledAt >= start && task.scheduledAt < end,
  );
}

/** Format an expected-time value for controls and rows. */
export function formatDuration(minutes: EstimateMinutes): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

/** Format a timestamp as a compact local time. */
export function formatCompactTime(timestamp: number): string {
  return compactTimeFormatter.format(new Date(timestamp));
}

/** Format a local clock value with seconds in 24-hour time. */
export function formatClockTime(value: Date): string {
  return clockTimeFormatter.format(value);
}

/** Format the date line for the selected activity range. */
export function formatScaleDate(scale: TimeScale, now = new Date()): string {
  if (scale === "day") {
    return dayFormatter.format(now);
  }
  if (scale === "month") {
    return monthFormatter.format(now);
  }

  const start = new Date(now);
  const dayFromMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayFromMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startText = weekRangeFormatter.format(start);
  const endText = weekRangeFormatter.format(end);
  return `Week ${isoWeekNumber(start)} · ${startText}–${endText}`;
}

/** Return the local start and exclusive end timestamps for an activity range. */
export function timeScaleRange(
  scale: TimeScale,
  anchor: Date,
): readonly [start: number, end: number] {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);

  if (scale === "week") {
    const dayFromMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayFromMonday);
  } else if (scale === "month") {
    start.setDate(1);
  }

  const end = new Date(start);
  if (scale === "day") {
    end.setDate(end.getDate() + 1);
  } else if (scale === "week") {
    end.setDate(end.getDate() + 7);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  return [start.getTime(), end.getTime()];
}

/** Put the current local time on a selected calendar date. */
export function timestampOnDate(date: Date, time = new Date()): number {
  const timestamp = new Date(date);
  timestamp.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
  return timestamp.getTime();
}

function isoWeekNumber(value: Date): number {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Move an activity date by one unit of the selected time scale. */
export function moveScaleDate(value: Date, scale: TimeScale, direction: -1 | 1): Date {
  const next = new Date(value);
  if (scale === "day") {
    next.setDate(next.getDate() + direction);
    return next;
  }
  if (scale === "week") {
    next.setDate(next.getDate() + direction * 7);
    return next;
  }

  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + direction);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

/** Return the visible heading for an activity range. */
export function timeScaleHeading(
  scale: TimeScale,
  anchor = new Date(),
  today = new Date(),
): string {
  if (scale === "day") {
    const calendarDay = (value: Date) =>
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000;
    const dayOffset = calendarDay(anchor) - calendarDay(today);
    if (dayOffset === 0) return "Today";
    if (dayOffset === 1) return "Tomorrow";
    if (dayOffset === -1) return "Yesterday";

    const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(anchor);
    const weekStart = (value: Date) => calendarDay(value) - ((value.getDay() || 7) - 1);
    const weekOffset = (weekStart(anchor) - weekStart(today)) / 7;
    if (weekOffset === 1) return `Next ${weekday}`;
    if (weekOffset === -1) return `Last ${weekday}`;
    return weekday;
  }
  if (scale === "week") return "This week";
  return "This month";
}
