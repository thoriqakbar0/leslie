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
  const createdAt = parseTimestamp(value.createdAt);
  if (
    id === null ||
    listId === null ||
    !listIds.has(listId) ||
    title === null ||
    !ESTIMATE_MINUTES.has(value.estimatedMinutes) ||
    createdAt === null
  ) {
    return null;
  }
  return { id, listId, title, estimatedMinutes: value.estimatedMinutes, createdAt };
}

function parseWorkLogEntry(value) {
  if (!isRecord(value)) return null;
  const id = parseNonEmptyString(value.id);
  const note = parseNonEmptyString(value.note);
  const createdAt = parseTimestamp(value.createdAt);
  return id === null || note === null || createdAt === null ? null : { id, note, createdAt };
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
  if (
    !isRecord(value) ||
    !Array.isArray(value.lists) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.workLog)
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
  if (tasks === null || workLog === null) return null;

  return { lists, activeListId, tasks, workLog };
}
