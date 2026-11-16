import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { createNotesAutosave } from "./notes-autosave";

afterEach(() => vi.useRealTimers());

describe("notes autosave", () => {
  it("debounces changes, flushes the latest text, and emits each change once", () => {
    vi.useFakeTimers();
    let markdown = "Original";
    const emitted: string[] = [];
    const notes = createNotesAutosave({
      initialMarkdown: markdown,
      readMarkdown: () => markdown,
      onMarkdownChange: (value) => emitted.push(value),
      delayMs: 200,
    });
    markdown = "First";
    notes.schedule();
    vi.advanceTimersByTime(150);
    markdown = "Latest";
    notes.schedule();
    vi.advanceTimersByTime(150);
    expect(emitted).toEqual([]);
    vi.advanceTimersByTime(50);
    expect(emitted).toEqual(["Latest"]);
    notes.flush();
    expect(emitted).toEqual(["Latest"]);
  });

  it("flushes before a pending timer and tolerates repeated close or cleanup", () => {
    vi.useFakeTimers();
    let markdown = "Original";
    const emitted: string[] = [];
    const notes = createNotesAutosave({
      initialMarkdown: markdown,
      readMarkdown: () => markdown,
      onMarkdownChange: (value) => emitted.push(value),
      delayMs: 200,
    });
    markdown = "Closing notes";
    notes.schedule();
    notes.flush();
    notes.flush();
    vi.runAllTimers();
    expect(emitted).toEqual(["Closing notes"]);
    notes.schedule();
    vi.runAllTimers();
    expect(emitted).toEqual(["Closing notes"]);
  });
});
