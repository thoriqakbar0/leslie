import { describe, expect, it } from "vite-plus/test";
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from "lexical";
import { $exportNotesMarkdown, NOTES_EDITOR_NODES } from "./notes-editor-config";
import { $expandNowAtSelection, $highlightClockTextNode, expandNowShortcut } from "./notes-now";

describe("notes @now shortcut", () => {
  const now = new Date(2026, 7, 11, 9, 8).getTime();

  it("expands a standalone shortcut at the cursor into local time", () => {
    expect(expandNowShortcut("@now", 4, now)).toEqual({ replacement: "09:08", start: 0 });
    expect(expandNowShortcut("leave @now", 10, now)).toEqual({
      replacement: "09:08",
      start: 6,
    });
  });

  it("leaves mentions and incomplete cursor positions unchanged", () => {
    expect(expandNowShortcut("email@now", 9, now)).toBeNull();
    expect(expandNowShortcut("@nowhere", 8, now)).toBeNull();
    expect(expandNowShortcut("@now", 3, now)).toBeNull();
  });

  it("replaces the token and keeps typing position in a Lexical update", () => {
    const editor = createEditor({
      namespace: "NowShortcutTest",
      nodes: NOTES_EDITOR_NODES,
      onError: (error) => {
        throw error;
      },
    });
    editor.update(
      () => {
        const text = $createTextNode("on the way @now");
        $getRoot().append($createParagraphNode().append(text));
        text.selectEnd();
        expect($expandNowAtSelection(now, true)).toBe(true);
      },
      { discrete: true },
    );

    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe(
      "on the way 09:08 ",
    );
    expect(editor.getEditorState().read($exportNotesMarkdown)).toBe("on the way `09:08`");
  });

  it("highlights an existing standalone clock without changing attached text", () => {
    const editor = createEditor({
      namespace: "ClockHighlightTest",
      nodes: NOTES_EDITOR_NODES,
      onError: (error) => {
        throw error;
      },
    });
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const clock = $createTextNode("started 09:51 now");
        const attached = $createTextNode(" version09:51");
        $getRoot().append(paragraph.append(clock, attached));
        expect($highlightClockTextNode(clock)).toBe(true);
        expect($highlightClockTextNode(attached)).toBe(false);
      },
      { discrete: true },
    );

    expect(editor.getEditorState().read($exportNotesMarkdown)).toBe(
      "started `09:51` now version09:51",
    );
  });
});
