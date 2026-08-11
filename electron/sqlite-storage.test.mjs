import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createLeslieDatabase } from "./sqlite-storage.mjs";

const state = {
  lists: [
    { id: "inbox", name: "Inbox" },
    { id: "work", name: "Work" },
  ],
  activeListId: "work",
  tasks: [
    {
      id: "task-one",
      listId: "work",
      title: "Prepare notes",
      notes: "Review the latest agenda.",
      estimatedMinutes: 30,
      scheduledAt: 100,
    },
  ],
  workLog: [
    {
      id: "log-one",
      note: "Reviewed notes.",
      notes: "Follow up tomorrow.",
      origin: "direct",
      createdAt: 200,
    },
  ],
  history: [
    {
      id: "history-one",
      itemId: "task-one",
      type: "title-changed",
      itemKind: "planned",
      previousTitle: "Prepare agenda",
      title: "Prepare notes",
      occurredAt: 300,
    },
  ],
};

const temporaryDirectories = [];
const databases = [];

function openDatabase() {
  const directory = mkdtempSync(path.join(tmpdir(), "leslie-sqlite-test-"));
  temporaryDirectories.push(directory);
  const database = createLeslieDatabase(path.join(directory, "leslie.sqlite3"));
  databases.push(database);
  return database;
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("SQLite storage", () => {
  it("adds empty notes when opening a version-one database", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "leslie-sqlite-test-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "leslie.sqlite3");
    const previousDatabase = new DatabaseSync(databasePath);
    previousDatabase.exec(`
      CREATE TABLE lists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      CREATE TABLE app_state (
        singleton INTEGER PRIMARY KEY,
        active_list_id TEXT NOT NULL
      ) STRICT;
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY NOT NULL,
        list_id TEXT NOT NULL,
        title TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      CREATE TABLE work_log (
        id TEXT PRIMARY KEY NOT NULL,
        note TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      INSERT INTO lists VALUES ('inbox', 'Inbox', 0);
      INSERT INTO app_state VALUES (1, 'inbox');
      INSERT INTO tasks VALUES ('task-old', 'inbox', 'Existing task', 30, 100, 0);
      INSERT INTO work_log VALUES ('log-old', 'Existing log', 200, 0);
      PRAGMA user_version = 1;
    `);
    previousDatabase.close();

    const database = createLeslieDatabase(databasePath);
    databases.push(database);

    expect(database.loadState()?.tasks).toEqual([
      {
        id: "task-old",
        listId: "inbox",
        title: "Existing task",
        notes: "",
        estimatedMinutes: 30,
        scheduledAt: 100,
      },
    ]);
    expect(database.loadState()?.workLog).toEqual([
      { id: "log-old", note: "Existing log", notes: "", origin: "direct", createdAt: 200 },
    ]);
    expect(database.loadState()?.history).toEqual([]);
  });

  it("adds empty work-log notes when opening a version-two database", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "leslie-sqlite-test-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "leslie.sqlite3");
    const previousDatabase = new DatabaseSync(databasePath);
    previousDatabase.exec(`
      CREATE TABLE lists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      CREATE TABLE app_state (
        singleton INTEGER PRIMARY KEY,
        active_list_id TEXT NOT NULL
      ) STRICT;
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY NOT NULL,
        list_id TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      CREATE TABLE work_log (
        id TEXT PRIMARY KEY NOT NULL,
        note TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      INSERT INTO lists VALUES ('inbox', 'Inbox', 0);
      INSERT INTO app_state VALUES (1, 'inbox');
      INSERT INTO work_log VALUES ('log-old', 'Existing log', 200, 0);
      PRAGMA user_version = 2;
    `);
    previousDatabase.close();

    const database = createLeslieDatabase(databasePath);
    databases.push(database);

    expect(database.loadState()?.workLog).toEqual([
      { id: "log-old", note: "Existing log", notes: "", origin: "direct", createdAt: 200 },
    ]);
    expect(database.loadState()?.history).toEqual([]);
  });

  it("adds empty history when opening a version-three database", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "leslie-sqlite-test-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "leslie.sqlite3");
    const previousDatabase = new DatabaseSync(databasePath);
    previousDatabase.exec(`
      CREATE TABLE lists (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, position INTEGER NOT NULL UNIQUE) STRICT;
      CREATE TABLE app_state (singleton INTEGER PRIMARY KEY, active_list_id TEXT NOT NULL) STRICT;
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY NOT NULL,
        list_id TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      CREATE TABLE work_log (
        id TEXT PRIMARY KEY NOT NULL,
        note TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        position INTEGER NOT NULL UNIQUE
      ) STRICT;
      INSERT INTO lists VALUES ('inbox', 'Inbox', 0);
      INSERT INTO app_state VALUES (1, 'inbox');
      INSERT INTO tasks VALUES ('task-old', 'inbox', 'Existing task', '', 30, 100, 0);
      PRAGMA user_version = 3;
    `);
    previousDatabase.close();

    const database = createLeslieDatabase(databasePath);
    databases.push(database);

    expect(database.loadState()?.history).toEqual([]);
  });

  it("infers work-log origins when opening a version-four database", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "leslie-sqlite-test-"));
    temporaryDirectories.push(directory);
    const databasePath = path.join(directory, "leslie.sqlite3");
    const previousDatabase = new DatabaseSync(databasePath);
    previousDatabase.exec(`
      CREATE TABLE lists (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, position INTEGER NOT NULL UNIQUE) STRICT;
      CREATE TABLE app_state (singleton INTEGER PRIMARY KEY, active_list_id TEXT NOT NULL) STRICT;
      CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL, list_id TEXT NOT NULL, title TEXT NOT NULL, notes TEXT NOT NULL, estimated_minutes INTEGER NOT NULL, created_at INTEGER NOT NULL, position INTEGER NOT NULL UNIQUE) STRICT;
      CREATE TABLE work_log (id TEXT PRIMARY KEY NOT NULL, note TEXT NOT NULL, notes TEXT NOT NULL, created_at INTEGER NOT NULL, position INTEGER NOT NULL UNIQUE) STRICT;
      CREATE TABLE history (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, item_id TEXT NOT NULL, item_kind TEXT, title TEXT NOT NULL, previous_title TEXT, occurred_at INTEGER NOT NULL, position INTEGER NOT NULL UNIQUE) STRICT;
      INSERT INTO lists VALUES ('inbox', 'Inbox', 0);
      INSERT INTO app_state VALUES (1, 'inbox');
      INSERT INTO work_log VALUES ('task-old', 'Renamed completed work', '', 200, 0);
      INSERT INTO work_log VALUES ('log-old', 'Direct work', '', 100, 1);
      INSERT INTO history VALUES ('history-old', 'planned-completed', 'task-old', NULL, 'Original task', NULL, 200, 0);
      PRAGMA user_version = 4;
    `);
    previousDatabase.close();

    const database = createLeslieDatabase(databasePath);
    databases.push(database);

    expect(database.loadState()?.workLog).toEqual([
      {
        id: "task-old",
        note: "Renamed completed work",
        notes: "",
        origin: "planned",
        createdAt: 200,
      },
      { id: "log-old", note: "Direct work", notes: "", origin: "direct", createdAt: 100 },
    ]);
  });

  it("starts empty and round-trips the complete state", () => {
    const database = openDatabase();

    expect(database.loadState()).toBeNull();
    database.saveState(state);

    expect(database.loadState()).toEqual(state);
  });

  it("replaces the state atomically while preserving source order", () => {
    const database = openDatabase();
    database.saveState(state);
    const replacement = {
      lists: [...state.lists].reverse(),
      activeListId: "inbox",
      tasks: [],
      workLog: [
        {
          id: "log-two",
          note: "Second entry.",
          notes: "Second notes.",
          origin: "planned",
          createdAt: 300,
        },
        {
          id: "log-one",
          note: "First entry.",
          notes: "",
          origin: "direct",
          createdAt: 200,
        },
      ],
      history: [],
    };

    database.saveState(replacement);

    expect(database.loadState()).toEqual(replacement);
  });

  it("rejects invalid boundary input without replacing stored data", () => {
    const database = openDatabase();
    database.saveState(state);

    expect(() =>
      database.saveState({
        ...state,
        activeListId: "missing",
      }),
    ).toThrow("Leslie state is invalid");
    expect(database.loadState()).toEqual(state);
  });
});
