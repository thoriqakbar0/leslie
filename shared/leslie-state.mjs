const ESTIMATE_MINUTES = new Set([15, 30, 60, 120, 240, 480]);

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function parseNonEmptyString(value) {
  if (typeof value !== "string") return null;
  const parsed = value.trim();
  return parsed.length > 0 ? parsed : null;
}

function parseTimestamp(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseList(value) {
  if (!isRecord(value)) return null;
  const id = parseNonEmptyString(value.id);
  const name = parseNonEmptyString(value.name);
  return id === null || name === null ? null : { id, name };
}

function parseTask(value, listIds) {
  if (!isRecord(value)) return null;
  const id = parseNonEmptyString(value.id);
  const listId = parseNonEmptyString(value.listId);
  const title = parseNonEmptyString(value.title);
  const notes =
    value.notes === undefined ? "" : typeof value.notes === "string" ? value.notes : null;
  const scheduledAt = parseTimestamp(value.scheduledAt);
  if (
    id === null ||
    listId === null ||
    !listIds.has(listId) ||
    title === null ||
    notes === null ||
    !ESTIMATE_MINUTES.has(value.estimatedMinutes) ||
    scheduledAt === null
  ) {
    return null;
  }
  return { id, listId, title, notes, estimatedMinutes: value.estimatedMinutes, scheduledAt };
}

function parseWorkLogEntry(value) {
  if (!isRecord(value)) return null;
  const id = parseNonEmptyString(value.id);
  const note = parseNonEmptyString(value.note);
  const notes =
    value.notes === undefined ? "" : typeof value.notes === "string" ? value.notes : null;
  const origin =
    value.origin === undefined
      ? note?.startsWith("Completed ")
        ? "planned"
        : "direct"
      : value.origin === "direct" || value.origin === "planned"
        ? value.origin
        : null;
  const createdAt = parseTimestamp(value.createdAt);
  return id === null || note === null || notes === null || origin === null || createdAt === null
    ? null
    : { id, note, notes, origin, createdAt };
}

function parseHistoryEntry(value) {
  if (!isRecord(value)) return null;
  const id = parseNonEmptyString(value.id);
  const itemId = parseNonEmptyString(value.itemId);
  const title = parseNonEmptyString(value.title);
  const occurredAt = parseTimestamp(value.occurredAt);
  if (id === null || itemId === null || title === null || occurredAt === null) return null;

  if (
    value.type === "planned-created" ||
    value.type === "did-created" ||
    value.type === "planned-completed"
  ) {
    return { id, itemId, type: value.type, title, occurredAt };
  }
  if (value.type !== "title-changed") return null;
  const previousTitle = parseNonEmptyString(value.previousTitle);
  if (previousTitle === null || (value.itemKind !== "planned" && value.itemKind !== "did")) {
    return null;
  }
  return {
    id,
    itemId,
    itemKind: value.itemKind,
    type: value.type,
    previousTitle,
    title,
    occurredAt,
  };
}

function parseUniqueItems(values, parseItem) {
  const items = [];
  const ids = new Set();
  for (const value of values) {
    const item = parseItem(value);
    if (item === null || ids.has(item.id)) return null;
    ids.add(item.id);
    items.push(item);
  }
  return items;
}

/** Parse unknown input into a complete Leslie state, or return null when any invariant fails. */
export function parseLeslieState(value) {
  const historyValues = isRecord(value) && value.history === undefined ? [] : value?.history;
  if (
    !isRecord(value) ||
    !Array.isArray(value.lists) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.workLog) ||
    !Array.isArray(historyValues)
  ) {
    return null;
  }

  const lists = parseUniqueItems(value.lists, parseList);
  if (lists === null || lists.length === 0) return null;
  const listIds = new Set(lists.map((list) => list.id));
  const activeListId = parseNonEmptyString(value.activeListId);
  if (activeListId === null || !listIds.has(activeListId)) return null;

  const tasks = parseUniqueItems(value.tasks, (task) => parseTask(task, listIds));
  const workLog = parseUniqueItems(value.workLog, parseWorkLogEntry);
  const history = parseUniqueItems(historyValues, parseHistoryEntry);
  if (tasks === null || workLog === null || history === null) return null;

  return { lists, activeListId, tasks, workLog, history };
}
