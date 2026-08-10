const HISTORY_LIMIT = 100;

/** Create a stable identifier for one timer run. */
export function createTimerRunId(now = Date.now()) {
  return `timer-${now}`;
}

/** Parse persisted timer history into the shape used by the interface. */
export function parseTimerHistory(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        (entry.kind === "focus" || entry.kind === "break") &&
        Number.isFinite(entry.duration) &&
        entry.duration > 0 &&
        typeof entry.completedAt === "string" &&
        !Number.isNaN(Date.parse(entry.completedAt)),
    )
    .filter(
      (entry, index, collection) =>
        collection.findIndex((candidate) => candidate.id === entry.id) === index,
    )
    .slice(0, HISTORY_LIMIT)
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      duration: entry.duration,
      completedAt: entry.completedAt,
    }));
}

/** Add one completed timer, newest first, without duplicate run entries. */
export function recordCompletedTimer(history, entry) {
  return parseTimerHistory([entry, ...history]).slice(0, HISTORY_LIMIT);
}
