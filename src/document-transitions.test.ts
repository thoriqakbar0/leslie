import { describe, expect, it } from "vite-plus/test";
import { createInitialState } from "./model";
import { documentReducer, type DocumentEvent } from "./document-transitions";

const initial = () => createInitialState(new Date(2026, 7, 10, 14));
const stamp = { historyId: "history-one", occurredAt: 1000 };

describe("document transitions", () => {
  it("completes a plan once, retaining its identity, folder, notes, and history", () => {
    let state = initial();
    state = documentReducer(state, {
      kind: "task-added",
      id: "task-one",
      title: "Send invoice",
      estimatedMinutes: 60,
      scheduledAt: 100,
      ...stamp,
    });
    state = documentReducer(state, {
      kind: "notes-changed",
      target: { kind: "task", id: "task-one" },
      notes: "Billing details",
    });
    state = documentReducer(state, { kind: "task-moved", id: "task-one", listId: "work" });
    state = documentReducer(state, {
      kind: "estimate-changed",
      id: "task-one",
      estimatedMinutes: 15,
    });
    expect(state.tasks[0]).toMatchObject({
      listId: "work",
      estimatedMinutes: 15,
      notes: "Billing details",
    });
    const complete: DocumentEvent = {
      kind: "task-completed",
      id: "task-one",
      createdAt: 2000,
      historyId: "history-complete",
      occurredAt: 3000,
    };
    state = documentReducer(state, complete);
    expect(state.tasks.some((task) => task.id === "task-one")).toBe(false);
    expect(state.workLog[0]).toEqual({
      id: "task-one",
      listId: "work",
      note: "Completed Send invoice.",
      notes: "Billing details",
      origin: "planned",
      createdAt: 2000,
    });
    expect(state.history.map((entry) => entry.type)).toEqual([
      "planned-completed",
      "planned-created",
    ]);
    expect(documentReducer(state, complete)).toBe(state);
  });

  it("records factual work and title corrections without duplicating unchanged history", () => {
    let state = documentReducer(initial(), {
      kind: "log-added",
      id: "log-one",
      note: "Reviewed",
      createdAt: 2000,
      ...stamp,
    });
    state = documentReducer(state, {
      kind: "notes-changed",
      target: { kind: "log", id: "log-one" },
      notes: "Follow up",
    });
    state = documentReducer(state, {
      kind: "title-changed",
      target: { kind: "log", id: "log-one" },
      title: "Reviewed invoice",
      historyId: "history-title",
      occurredAt: 3000,
    });
    const unchanged: DocumentEvent = {
      kind: "title-changed",
      target: { kind: "log", id: "log-one" },
      title: "Reviewed invoice",
      ...stamp,
    };
    expect(documentReducer(state, unchanged)).toBe(state);
    state = documentReducer(state, { kind: "log-time-changed", id: "log-one", createdAt: 4000 });
    expect(state.workLog[0]).toEqual({
      id: "log-one",
      listId: "inbox",
      note: "Reviewed invoice",
      notes: "Follow up",
      origin: "direct",
      createdAt: 4000,
    });
    expect(state.history[0]).toEqual({
      id: "history-title",
      itemId: "log-one",
      itemKind: "did",
      type: "title-changed",
      previousTitle: "Reviewed",
      title: "Reviewed invoice",
      occurredAt: 3000,
    });
    const task = state.tasks[0];
    state = documentReducer(state, {
      kind: "title-changed",
      target: { kind: "task", id: task.id },
      title: "Corrected plan",
      ...stamp,
    });
    expect(state.history[0]).toMatchObject({
      itemKind: "planned",
      previousTitle: task.title,
      title: "Corrected plan",
    });
    expect(state.tasks[0].title).toBe("Corrected plan");
  });

  it("selects existing case-insensitive folders and refuses duplicate renames", () => {
    let state = documentReducer(initial(), { kind: "list-added", id: "duplicate", name: "WORK" });
    expect(state.activeListId).toBe("work");
    expect(state.lists).toHaveLength(4);
    expect(documentReducer(state, { kind: "list-renamed", id: "inbox", name: "work" })).toBe(state);
    state = documentReducer(state, { kind: "list-added", id: "new", name: "New" });
    state = documentReducer(state, { kind: "list-renamed", id: "new", name: "Renamed" });
    state = documentReducer(state, { kind: "list-selected", id: "new" });
    expect(state.lists.at(-1)).toEqual({ id: "new", name: "Renamed" });
    expect(state.activeListId).toBe("new");
    expect(
      documentReducer(state, { kind: "task-moved", id: state.tasks[0].id, listId: "missing" }),
    ).toBe(state);
  });

  it("removes a folder, reassigns factual work, and restores the exact undo snapshot", () => {
    const original = initial();
    const list = original.lists[0];
    const removed = {
      kind: "list",
      list,
      tasks: original.tasks.filter((task) => task.listId === list.id),
      workLog: original.workLog.filter((entry) => entry.listId === list.id),
    } satisfies import("./document-transitions").RemovedItem;
    let state = documentReducer(original, { kind: "list-removed", id: list.id });
    expect(state.tasks.every((task) => task.listId !== list.id)).toBe(true);
    expect(state.workLog.every((entry) => entry.listId === "work")).toBe(true);
    expect(state.activeListId).toBe("work");
    state = documentReducer(state, { kind: "removal-undone", removed });
    expect(state.activeListId).toBe("inbox");
    expect(state.workLog).toEqual(original.workLog);
    expect(state.tasks).toEqual(original.tasks);
    expect(state.lists.at(-1)).toEqual(list);
    const single = { ...original, lists: [list] };
    expect(documentReducer(single, { kind: "list-removed", id: list.id })).toBe(single);
  });

  it("restores task and log removals without changing their content", () => {
    const original = initial();
    const task = original.tasks[0];
    let state = documentReducer(original, { kind: "task-removed", id: task.id });
    expect(state.tasks.some((item) => item.id === task.id)).toBe(false);
    state = documentReducer(state, { kind: "removal-undone", removed: { kind: "task", task } });
    expect(state.tasks).toEqual(original.tasks);
    const entry = original.workLog[0];
    state = documentReducer(state, { kind: "log-removed", id: entry.id });
    expect(state.workLog.some((item) => item.id === entry.id)).toBe(false);
    state = documentReducer(state, { kind: "removal-undone", removed: { kind: "log", entry } });
    expect(state.workLog).toEqual(original.workLog);
  });
});
