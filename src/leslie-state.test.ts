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
      estimatedMinutes: 30,
      createdAt: 100,
    },
  ],
  workLog: [{ id: "log-one", note: "Reviewed notes.", createdAt: 200 }],
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
});
