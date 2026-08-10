import { createInitialState, parseEstimate } from "./model";
import type { LeslieState, PlannedItem, TaskList, WorkLogEntry } from "./model";

const DATABASE_NAME = "leslie";
const DATABASE_VERSION = 1;
const DOCUMENT_STORE = "documents";
const PRIMARY_DOCUMENT_KEY = "primary";

/** The local database operation that failed. */
export type LocalDatabaseOperation = "open" | "read" | "write";

/** A safe failure value for a local IndexedDB operation. */
export class LocalDatabaseError extends Error {
  readonly _tag = "LocalDatabaseError";
  readonly operation: LocalDatabaseOperation;

  /** Create a local database error without exposing stored data. */
  constructor(operation: LocalDatabaseOperation, options?: ErrorOptions) {
    super(`Leslie could not ${operation} its local database`, options);
    this.name = "LocalDatabaseError";
    this.operation = operation;
  }
}

/** The result of a local database operation. */
export type StorageResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: LocalDatabaseError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseList(value: unknown): TaskList | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return null;
  }
  const name = value.name.trim();
  if (!value.id || !name) return null;
  return { id: value.id, name };
}

function parseTask(value: unknown, listIds: ReadonlySet<string>): PlannedItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.listId !== "string" ||
    !listIds.has(value.listId) ||
    typeof value.title !== "string" ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt)
  ) {
    return null;
  }
  const estimatedMinutes = parseEstimate(String(value.estimatedMinutes));
  const title = value.title.trim();
  if (!value.id || !title || estimatedMinutes === null) return null;
  return {
    id: value.id,
    listId: value.listId,
    title,
    estimatedMinutes,
    createdAt: value.createdAt,
  };
}

function parseWorkLogEntry(value: unknown): WorkLogEntry | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.note !== "string" ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt)
  ) {
    return null;
  }
  const note = value.note.trim();
  if (!value.id || !note) return null;
  return { id: value.id, note, createdAt: value.createdAt };
}

function parseState(value: unknown): LeslieState | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.lists) ||
    !Array.isArray(value.tasks) ||
    !Array.isArray(value.workLog)
  ) {
    return null;
  }

  const lists = value.lists.map(parseList).filter((list): list is TaskList => list !== null);
  if (lists.length === 0) return null;
  const listIds = new Set(lists.map((list) => list.id));
  if (typeof value.activeListId !== "string" || !listIds.has(value.activeListId)) return null;

  const tasks = value.tasks
    .map((task) => parseTask(task, listIds))
    .filter((task): task is PlannedItem => task !== null);
  const workLog = value.workLog
    .map(parseWorkLogEntry)
    .filter((entry): entry is WorkLogEntry => entry !== null);

  return { lists, activeListId: value.activeListId, tasks, workLog };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DOCUMENT_STORE)) {
        database.createObjectStore(DOCUMENT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onblocked = () => reject(new Error("IndexedDB upgrade was blocked"));
  });
}

function requestValue(request: IDBRequest<unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/** Load and parse the document from Leslie's local-only IndexedDB database. */
export async function loadState(): Promise<StorageResult<LeslieState>> {
  let database: IDBDatabase | null = null;
  try {
    database = await openDatabase();
    const transaction = database.transaction(DOCUMENT_STORE, "readonly");
    const completion = waitForTransaction(transaction);
    const request: IDBRequest<unknown> = transaction
      .objectStore(DOCUMENT_STORE)
      .get(PRIMARY_DOCUMENT_KEY);
    const stored = await requestValue(request);
    await completion;

    if (stored === undefined) return { ok: true, value: createInitialState() };
    const parsed = parseState(stored);
    if (parsed === null) {
      return {
        ok: false,
        error: new LocalDatabaseError("read", {
          cause: new Error("Stored document schema is invalid"),
        }),
      };
    }
    return { ok: true, value: parsed };
  } catch (cause: unknown) {
    const operation: LocalDatabaseOperation = database === null ? "open" : "read";
    return { ok: false, error: new LocalDatabaseError(operation, { cause }) };
  } finally {
    database?.close();
  }
}

/** Save the document to Leslie's local-only IndexedDB database. */
export async function saveState(state: LeslieState): Promise<StorageResult<void>> {
  let database: IDBDatabase | null = null;
  try {
    database = await openDatabase();
    const transaction = database.transaction(DOCUMENT_STORE, "readwrite");
    const completion = waitForTransaction(transaction);
    transaction.objectStore(DOCUMENT_STORE).put(state, PRIMARY_DOCUMENT_KEY);
    await completion;
    return { ok: true, value: undefined };
  } catch (cause: unknown) {
    const operation: LocalDatabaseOperation = database === null ? "open" : "write";
    return { ok: false, error: new LocalDatabaseError(operation, { cause }) };
  } finally {
    database?.close();
  }
}
