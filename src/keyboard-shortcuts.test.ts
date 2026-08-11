import { describe, expect, it } from "vite-plus/test";
import { dateShortcutDirection, isPostTypeSwitchShortcut } from "./keyboard-shortcuts";

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

describe("post type keyboard shortcut", () => {
  it("accepts Command-Shift-P at either letter case", () => {
    expect(
      isPostTypeSwitchShortcut({
        altKey: false,
        ctrlKey: false,
        key: "p",
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(true);
    expect(
      isPostTypeSwitchShortcut({
        altKey: false,
        ctrlKey: false,
        key: "P",
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(true);
  });

  it("rejects the old shortcut and extra modifiers", () => {
    expect(
      isPostTypeSwitchShortcut({
        altKey: false,
        ctrlKey: false,
        key: "m",
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
    expect(
      isPostTypeSwitchShortcut({
        altKey: true,
        ctrlKey: false,
        key: "p",
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe(false);
  });
});
