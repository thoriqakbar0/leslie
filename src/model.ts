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
  readonly estimatedMinutes: EstimateMinutes;
  readonly createdAt: number;
}

/** A record of work that the user did. */
export interface WorkLogEntry {
  readonly id: string;
  readonly note: string;
  readonly createdAt: number;
}

/** The complete local Leslie document. */
export interface LeslieState {
  readonly lists: readonly TaskList[];
  readonly activeListId: string;
  readonly tasks: readonly PlannedItem[];
  readonly workLog: readonly WorkLogEntry[];
}

/** All supported expected-time values, in display order. */
export const ESTIMATE_OPTIONS: readonly EstimateMinutes[] = [15, 30, 60, 120, 240, 480];

const initialLists: readonly TaskList[] = [
  { id: "inbox", name: "Inbox" },
  { id: "work", name: "Work" },
  { id: "personal", name: "Personal" },
  { id: "someday", name: "Someday" },
];

const entryTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
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
  const createdAt = now.getTime();
  return {
    lists: initialLists,
    activeListId: "inbox",
    tasks: [
      {
        id: "task-invoice",
        listId: "inbox",
        title: "Send the invoice",
        estimatedMinutes: 30,
        createdAt,
      },
      { id: "task-alex", listId: "inbox", title: "Reply to Alex", estimatedMinutes: 15, createdAt },
      {
        id: "task-dentist",
        listId: "inbox",
        title: "Book dentist appointment",
        estimatedMinutes: 30,
        createdAt,
      },
      {
        id: "task-meeting",
        listId: "work",
        title: "Prepare meeting notes",
        estimatedMinutes: 60,
        createdAt,
      },
      {
        id: "task-plants",
        listId: "personal",
        title: "Water the plants",
        estimatedMinutes: 15,
        createdAt,
      },
      {
        id: "task-receipts",
        listId: "someday",
        title: "Sort travel receipts",
        estimatedMinutes: 120,
        createdAt,
      },
    ],
    workLog: [
      { id: "log-details", note: "Reviewed the invoice details.", createdAt: todayAt(now, 10, 42) },
      { id: "log-template", note: "Opened the invoice template.", createdAt: todayAt(now, 10, 25) },
      { id: "log-source", note: "Found the last invoice.", createdAt: todayAt(now, 9, 58) },
    ],
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

/** Extract a supported duration from the end of natural-language task text. */
export function parsePlannedInput(
  value: string,
  fallbackMinutes: EstimateMinutes,
): { readonly title: string; readonly estimatedMinutes: EstimateMinutes } {
  const duration = value.match(
    /\s+(?:(?:for|in|about)\s+)?(15|30|60|1|2|4|8)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\s*$/i,
  );
  const cleanValue = value.trim();
  if (!duration) return { title: cleanValue, estimatedMinutes: fallbackMinutes };

  const amount = Number(duration[1]);
  const unit = duration[2]?.toLowerCase() ?? "";
  const parsedMinutes = parseEstimate(String(unit.startsWith("h") ? amount * 60 : amount));
  if (parsedMinutes === null) return { title: cleanValue, estimatedMinutes: fallbackMinutes };

  const title = value.slice(0, duration.index).trim();
  return { title: title || cleanValue, estimatedMinutes: parsedMinutes };
}

/** Format an expected-time value for controls and rows. */
export function formatDuration(minutes: EstimateMinutes): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

/** Format a work-log timestamp as a compact local time. */
export function formatEntryTime(timestamp: number): string {
  return entryTimeFormatter.format(new Date(timestamp));
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
export function timeScaleHeading(scale: TimeScale): string {
  if (scale === "day") return "Today";
  if (scale === "week") return "This week";
  return "This month";
}
