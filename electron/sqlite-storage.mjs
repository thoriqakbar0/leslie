import { DatabaseSync } from "node:sqlite";
import { parseLeslieState } from "../shared/leslie-state.mjs";

const SCHEMA_VERSION = 3;

function schemaVersion(database) {
  const row = database.prepare("PRAGMA user_version").get();
  return typeof row?.user_version === "number" ? row.user_version : null;
}

function initializeSchema(database) {
  const version = schemaVersion(database);
  if (version === SCHEMA_VERSION) return;
  if (version === 1) {
    database.exec(`
      BEGIN IMMEDIATE;
      ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT '';
      ALTER TABLE work_log ADD COLUMN notes TEXT NOT NULL DEFAULT '';
      PRAGMA user_version = ${SCHEMA_VERSION};
      COMMIT;
    `);
    return;
  }
  if (version === 2) {
    database.exec(`
      BEGIN IMMEDIATE;
      ALTER TABLE work_log ADD COLUMN notes TEXT NOT NULL DEFAULT '';
      PRAGMA user_version = ${SCHEMA_VERSION};
      COMMIT;
    `);
    return;
  }
  if (version !== 0) throw new Error("Leslie database schema is not supported");

  database.exec(`
    BEGIN IMMEDIATE;

    CREATE TABLE lists (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
    ) STRICT;

    CREATE TABLE app_state (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      active_list_id TEXT NOT NULL REFERENCES lists(id)
    ) STRICT;

    CREATE TABLE tasks (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      notes TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes IN (15, 30, 60, 120, 240, 480)),
      created_at INTEGER NOT NULL CHECK (created_at >= 0),
      position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
    ) STRICT;

    CREATE TABLE work_log (
      id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
      note TEXT NOT NULL CHECK (length(trim(note)) > 0),
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL CHECK (created_at >= 0),
      position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
    ) STRICT;

    PRAGMA user_version = ${SCHEMA_VERSION};
    COMMIT;
  `);
}

function rollback(database) {
  try {
    database.exec("ROLLBACK");
  } catch {
    // The original transaction failure is the useful error.
  }
}

/** Open Leslie's relational SQLite store and own its connection until close. */
export function createLeslieDatabase(databasePath) {
  const database = new DatabaseSync(databasePath, {
    allowExtension: false,
    defensive: true,
    enableDoubleQuotedStringLiterals: false,
    enableForeignKeyConstraints: true,
    readBigInts: false,
    timeout: 5_000,
  });

  try {
    database.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    initializeSchema(database);
  } catch (cause) {
    database.close();
    throw cause;
  }

  const insertList = database.prepare("INSERT INTO lists (id, name, position) VALUES (?, ?, ?)");
  const insertTask = database.prepare(
    "INSERT INTO tasks (id, list_id, title, notes, estimated_minutes, created_at, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertWorkLog = database.prepare(
    "INSERT INTO work_log (id, note, notes, created_at, position) VALUES (?, ?, ?, ?, ?)",
  );
  const insertAppState = database.prepare(
    "INSERT INTO app_state (singleton, active_list_id) VALUES (1, ?)",
  );
  let isClosed = false;

  return Object.freeze({
    /** Return the stored state, or null when this database has not received its first document. */
    loadState() {
      const activeState = database
        .prepare("SELECT active_list_id FROM app_state WHERE singleton = 1")
        .get();
      if (activeState === undefined) {
        const row = database
          .prepare(
            "SELECT (SELECT count(*) FROM lists) + (SELECT count(*) FROM tasks) + (SELECT count(*) FROM work_log) AS row_count",
          )
          .get();
        if (row?.row_count === 0) return null;
        throw new Error("Leslie database has data without application state");
      }

      const candidate = {
        activeListId: activeState.active_list_id,
        lists: database
          .prepare("SELECT id, name FROM lists ORDER BY position")
          .all()
          .map((row) => ({ id: row.id, name: row.name })),
        tasks: database
          .prepare(
            "SELECT id, list_id, title, notes, estimated_minutes, created_at FROM tasks ORDER BY position",
          )
          .all()
          .map((row) => ({
            id: row.id,
            listId: row.list_id,
            title: row.title,
            notes: row.notes,
            estimatedMinutes: row.estimated_minutes,
            scheduledAt: row.created_at,
          })),
        workLog: database
          .prepare("SELECT id, note, notes, created_at FROM work_log ORDER BY position")
          .all()
          .map((row) => ({
            id: row.id,
            note: row.note,
            notes: row.notes,
            createdAt: row.created_at,
          })),
      };
      const state = parseLeslieState(candidate);
      if (state === null) throw new Error("Leslie database contains invalid state");
      return state;
    },

    /** Replace the stored state in one transaction after parsing every input value. */
    saveState(value) {
      const state = parseLeslieState(value);
      if (state === null) throw new Error("Leslie state is invalid");

      database.exec("BEGIN IMMEDIATE");
      try {
        database.exec(
          "DELETE FROM tasks; DELETE FROM work_log; DELETE FROM app_state; DELETE FROM lists;",
        );
        state.lists.forEach((list, position) => insertList.run(list.id, list.name, position));
        state.tasks.forEach((task, position) =>
          insertTask.run(
            task.id,
            task.listId,
            task.title,
            task.notes,
            task.estimatedMinutes,
            task.scheduledAt,
            position,
          ),
        );
        state.workLog.forEach((entry, position) =>
          insertWorkLog.run(entry.id, entry.note, entry.notes, entry.createdAt, position),
        );
        insertAppState.run(state.activeListId);
        database.exec("COMMIT");
      } catch (cause) {
        rollback(database);
        throw cause;
      }
    },

    /** Close the owned SQLite connection. Further calls are invalid. */
    close() {
      if (isClosed) return;
      database.close();
      isClosed = true;
    },
  });
}
