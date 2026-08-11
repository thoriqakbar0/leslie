import { DatabaseSync } from "node:sqlite";
import { parseLeslieState } from "../shared/leslie-state.mjs";

const SCHEMA_VERSION = 5;

const HISTORY_SCHEMA = `
  CREATE TABLE history (
    id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
    type TEXT NOT NULL CHECK (type IN ('planned-created', 'did-created', 'title-changed', 'planned-completed')),
    item_id TEXT NOT NULL CHECK (length(trim(item_id)) > 0),
    item_kind TEXT CHECK (item_kind IN ('planned', 'did')),
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    previous_title TEXT,
    occurred_at INTEGER NOT NULL CHECK (occurred_at >= 0),
    position INTEGER NOT NULL UNIQUE CHECK (position >= 0),
    CHECK (
      (type = 'title-changed' AND item_kind IS NOT NULL AND length(trim(previous_title)) > 0)
      OR
      (type != 'title-changed' AND item_kind IS NULL AND previous_title IS NULL)
    )
  ) STRICT;
`;

function schemaVersion(database) {
  const row = database.prepare("PRAGMA user_version").get();
  return typeof row?.user_version === "number" ? row.user_version : null;
}

function initializeSchema(database) {
  const version = schemaVersion(database);
  if (version === SCHEMA_VERSION) return;
  if (version >= 1 && version <= 4) {
    const addTaskNotes =
      version === 1 ? "ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT '';" : "";
    const addWorkLogNotes =
      version <= 2 ? "ALTER TABLE work_log ADD COLUMN notes TEXT NOT NULL DEFAULT '';" : "";
    const addHistory = version <= 3 ? HISTORY_SCHEMA : "";
    database.exec(`
      BEGIN IMMEDIATE;
      ${addTaskNotes}
      ${addWorkLogNotes}
      ${addHistory}
      ALTER TABLE work_log ADD COLUMN origin TEXT NOT NULL DEFAULT 'direct'
        CHECK (origin IN ('direct', 'planned'));
      UPDATE work_log
      SET origin = 'planned'
      WHERE note LIKE 'Completed %'
        OR EXISTS (
          SELECT 1 FROM history
          WHERE history.item_id = work_log.id AND history.type = 'planned-completed'
        );
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
      origin TEXT NOT NULL DEFAULT 'direct' CHECK (origin IN ('direct', 'planned')),
      created_at INTEGER NOT NULL CHECK (created_at >= 0),
      position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
    ) STRICT;

    ${HISTORY_SCHEMA}

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
    "INSERT INTO work_log (id, note, notes, origin, created_at, position) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insertAppState = database.prepare(
    "INSERT INTO app_state (singleton, active_list_id) VALUES (1, ?)",
  );
  const insertHistory = database.prepare(
    "INSERT INTO history (id, type, item_id, item_kind, title, previous_title, occurred_at, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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
            "SELECT (SELECT count(*) FROM lists) + (SELECT count(*) FROM tasks) + (SELECT count(*) FROM work_log) + (SELECT count(*) FROM history) AS row_count",
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
          .prepare("SELECT id, note, notes, origin, created_at FROM work_log ORDER BY position")
          .all()
          .map((row) => ({
            id: row.id,
            note: row.note,
            notes: row.notes,
            origin: row.origin,
            createdAt: row.created_at,
          })),
        history: database
          .prepare(
            "SELECT id, type, item_id, item_kind, title, previous_title, occurred_at FROM history ORDER BY position",
          )
          .all()
          .map((row) =>
            row.type === "title-changed"
              ? {
                  id: row.id,
                  itemId: row.item_id,
                  itemKind: row.item_kind,
                  type: row.type,
                  previousTitle: row.previous_title,
                  title: row.title,
                  occurredAt: row.occurred_at,
                }
              : {
                  id: row.id,
                  itemId: row.item_id,
                  type: row.type,
                  title: row.title,
                  occurredAt: row.occurred_at,
                },
          ),
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
          "DELETE FROM history; DELETE FROM tasks; DELETE FROM work_log; DELETE FROM app_state; DELETE FROM lists;",
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
          insertWorkLog.run(
            entry.id,
            entry.note,
            entry.notes,
            entry.origin,
            entry.createdAt,
            position,
          ),
        );
        state.history.forEach((entry, position) =>
          insertHistory.run(
            entry.id,
            entry.type,
            entry.itemId,
            entry.type === "title-changed" ? entry.itemKind : null,
            entry.title,
            entry.type === "title-changed" ? entry.previousTitle : null,
            entry.occurredAt,
            position,
          ),
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
