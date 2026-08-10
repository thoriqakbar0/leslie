import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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
      estimatedMinutes: 30,
      createdAt: 100,
    },
  ],
  workLog: [{ id: "log-one", note: "Reviewed notes.", createdAt: 200 }],
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
        { id: "log-two", note: "Second entry.", createdAt: 300 },
        { id: "log-one", note: "First entry.", createdAt: 200 },
      ],
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
