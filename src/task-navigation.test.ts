import { describe, expect, it } from "vite-plus/test";
import { taskNavigationIndex } from "./task-navigation";

describe("task keyboard navigation", () => {
  it("selects the first task with j and the last task with k", () => {
    expect(taskNavigationIndex(3, -1, "j")).toBe(0);
    expect(taskNavigationIndex(3, -1, "k")).toBe(2);
  });

  it("moves one task and stops at each boundary", () => {
    expect(taskNavigationIndex(3, 0, "j")).toBe(1);
    expect(taskNavigationIndex(3, 2, "j")).toBe(2);
    expect(taskNavigationIndex(3, 2, "k")).toBe(1);
    expect(taskNavigationIndex(3, 0, "k")).toBe(0);
  });

  it("returns null when there are no tasks", () => {
    expect(taskNavigationIndex(0, -1, "j")).toBeNull();
  });
});
