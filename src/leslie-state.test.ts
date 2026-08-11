import { describe, expect, it } from "vite-plus/test";
import { parseLeslieState } from "../shared/leslie-state.mjs";

const validState = {
  lists: [{ id: "inbox", name: "Inbox" }],
  activeListId: "inbox",
  tasks: [
    {
      id: "task-one",
      listId: "inbox",
      title: "Prepare notes",
      notes: "Review the latest agenda.",
      estimatedMinutes: 30,
      scheduledAt: 100,
    },
  ],
  workLog: [
    {
      id: "log-one",
      listId: "inbox",
      note: "Reviewed notes.",
      notes: "Follow up.",
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

describe("Leslie state parser", () => {
  it("returns a clean state for valid unknown input", () => {
    expect(parseLeslieState(validState)).toEqual(validState);
  });

  it("rejects duplicate identifiers", () => {
    expect(
      parseLeslieState({
        ...validState,
        lists: [validState.lists[0], validState.lists[0]],
      }),
    ).toBeNull();
  });

  it("rejects tasks outside the selected list set", () => {
    expect(
      parseLeslieState({
        ...validState,
        tasks: [{ ...validState.tasks[0], listId: "missing" }],
      }),
    ).toBeNull();
  });

  it("preserves empty task notes and initializes absent task notes", () => {
    expect(
      parseLeslieState({
        ...validState,
        tasks: [{ ...validState.tasks[0], notes: "" }],
      }),
    ).toEqual({
      ...validState,
      tasks: [{ ...validState.tasks[0], notes: "" }],
    });

    const { notes: _notes, ...taskWithoutNotes } = validState.tasks[0];
    expect(parseLeslieState({ ...validState, tasks: [taskWithoutNotes] })).toEqual({
      ...validState,
      tasks: [{ ...taskWithoutNotes, notes: "" }],
    });

    expect(
      parseLeslieState({
        ...validState,
        tasks: [{ ...validState.tasks[0], notes: 42 }],
      }),
    ).toBeNull();
  });

  it("preserves empty work-log notes and initializes absent work-log notes", () => {
    expect(
      parseLeslieState({
        ...validState,
        workLog: [{ ...validState.workLog[0], notes: "" }],
      }),
    ).toEqual({
      ...validState,
      workLog: [{ ...validState.workLog[0], notes: "" }],
    });

    const { notes: _notes, ...logWithoutNotes } = validState.workLog[0];
    expect(parseLeslieState({ ...validState, workLog: [logWithoutNotes] })).toEqual({
      ...validState,
      workLog: [{ ...logWithoutNotes, notes: "" }],
    });

    expect(
      parseLeslieState({
        ...validState,
        workLog: [{ ...validState.workLog[0], notes: 42 }],
      }),
    ).toBeNull();
  });

  it("preserves work-log origin and infers it for legacy entries", () => {
    const { origin: _origin, ...legacyLog } = validState.workLog[0];
    expect(parseLeslieState({ ...validState, workLog: [legacyLog] })?.workLog[0].origin).toBe(
      "direct",
    );
    expect(
      parseLeslieState({
        ...validState,
        workLog: [{ ...legacyLog, note: "Completed Prepare notes." }],
      })?.workLog[0].origin,
    ).toBe("planned");
    expect(
      parseLeslieState({
        ...validState,
        workLog: [{ ...validState.workLog[0], origin: "unknown" }],
      }),
    ).toBeNull();
  });

  it("validates work-log folders and assigns legacy entries to the active folder", () => {
    const { listId: _listId, ...legacyLog } = validState.workLog[0];
    expect(parseLeslieState({ ...validState, workLog: [legacyLog] })?.workLog[0].listId).toBe(
      "inbox",
    );
    expect(
      parseLeslieState({
        ...validState,
        workLog: [{ ...validState.workLog[0], listId: "missing" }],
      }),
    ).toBeNull();
  });

  it("initializes absent history and rejects invalid history variants", () => {
    const { history: _history, ...stateWithoutHistory } = validState;
    expect(parseLeslieState(stateWithoutHistory)).toEqual({
      ...stateWithoutHistory,
      history: [],
    });

    expect(
      parseLeslieState({
        ...validState,
        history: [{ ...validState.history[0], previousTitle: "" }],
      }),
    ).toBeNull();
  });
});
