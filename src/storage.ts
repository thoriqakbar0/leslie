import { parseLeslieState } from "../shared/leslie-state.mjs";
import { createInitialState } from "./model";
import type { LeslieState } from "./model";

const LEGACY_DATABASE_NAME = "leslie";
const LEGACY_DOCUMENT_STORE = "documents";
const LEGACY_PRIMARY_DOCUMENT_KEY = "primary";

/** The local database operation that failed. */
export type LocalDatabaseOperation = "open" | "read" | "write";

/** A safe failure value for a local SQLite operation. */
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

function failureOperation(
  value: unknown,
  fallback: LocalDatabaseOperation,
): LocalDatabaseOperation {
  if (!isRecord(value) || !isRecord(value.error)) return fallback;
  const operation = value.error.operation;
  return operation === "open" || operation === "read" || operation === "write"
    ? operation
    : fallback;
}

function openLegacyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(LEGACY_DATABASE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onblocked = () => reject(new Error("IndexedDB open was blocked"));
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

async function loadLegacyState(): Promise<LeslieState | null> {
  const databases = await window.indexedDB.databases();
  if (!databases.some((database) => database.name === LEGACY_DATABASE_NAME)) return null;

  const database = await openLegacyDatabase();
  try {
    if (!database.objectStoreNames.contains(LEGACY_DOCUMENT_STORE)) return null;
    const transaction = database.transaction(LEGACY_DOCUMENT_STORE, "readonly");
    const completion = waitForTransaction(transaction);
    const stored = await requestValue(
      transaction.objectStore(LEGACY_DOCUMENT_STORE).get(LEGACY_PRIMARY_DOCUMENT_KEY),
    );
    await completion;
    if (stored === undefined) return null;
    const parsed = parseLeslieState(stored);
    if (parsed === null) throw new Error("Stored IndexedDB state is invalid");
    return parsed;
  } finally {
    database.close();
  }
}

async function loadSqliteState(): Promise<StorageResult<LeslieState | null>> {
  try {
    const response: unknown = await window.leslieStorage.load();
    if (!isRecord(response) || response.ok !== true) {
      return {
        ok: false,
        error: new LocalDatabaseError(failureOperation(response, "read")),
      };
    }
    if (response.value === null) return { ok: true, value: null };
    const parsed = parseLeslieState(response.value);
    if (parsed === null) {
      return {
        ok: false,
        error: new LocalDatabaseError("read", {
          cause: new Error("Stored SQLite state is invalid"),
        }),
      };
    }
    return { ok: true, value: parsed };
  } catch (cause: unknown) {
    return { ok: false, error: new LocalDatabaseError("read", { cause }) };
  }
}

/** Load Leslie's state from SQLite, importing the former IndexedDB document once when needed. */
export async function loadState(): Promise<StorageResult<LeslieState>> {
  const loaded = await loadSqliteState();
  if (!loaded.ok) return loaded;
  if (loaded.value !== null) return { ok: true, value: loaded.value };

  let state: LeslieState;
  try {
    state = (await loadLegacyState()) ?? createInitialState();
  } catch (cause: unknown) {
    return { ok: false, error: new LocalDatabaseError("read", { cause }) };
  }

  const saved = await saveState(state);
  return saved.ok ? { ok: true, value: state } : saved;
}

/** Save Leslie's complete state through the validated main-process SQLite transaction. */
export async function saveState(state: LeslieState): Promise<StorageResult<void>> {
  try {
    const response: unknown = await window.leslieStorage.save(state);
    if (!isRecord(response) || response.ok !== true) {
      return {
        ok: false,
        error: new LocalDatabaseError(failureOperation(response, "write")),
      };
    }
    return { ok: true, value: undefined };
  } catch (cause: unknown) {
    return { ok: false, error: new LocalDatabaseError("write", { cause }) };
  }
}
