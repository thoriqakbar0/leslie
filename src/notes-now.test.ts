import { describe, expect, it } from "vite-plus/test";
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from "lexical";
import { $expandNowAtSelection, expandNowShortcut } from "./notes-now";

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
  });
});
