import { describe, expect, it } from "vite-plus/test";
import { dateShortcutDirection } from "./keyboard-shortcuts";

describe("date keyboard shortcuts", () => {
  it("maps h and l to previous and next at either letter case", () => {
    expect(dateShortcutDirection("h")).toBe(-1);
    expect(dateShortcutDirection("H")).toBe(-1);
    expect(dateShortcutDirection("l")).toBe(1);
    expect(dateShortcutDirection("L")).toBe(1);
  });

  it("ignores unrelated keys", () => {
    expect(dateShortcutDirection("j")).toBeNull();
    expect(dateShortcutDirection("ArrowLeft")).toBeNull();
  });
});
