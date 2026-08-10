import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { createEditor } from "lexical";
import {
  $exportNotesMarkdown,
  $importNotesMarkdown,
  NOTES_EDITOR_NODES,
} from "../notes-editor-config";
import { NotesSidebar } from "./NotesSidebar";

function roundTripMarkdown(markdown: string): string {
  const editor = createEditor({
    namespace: "NotesSidebarTest",
    nodes: NOTES_EDITOR_NODES,
    onError: (error) => {
      throw error;
    },
  });
  editor.update(() => $importNotesMarkdown(markdown), { discrete: true });
  return editor.getEditorState().read($exportNotesMarkdown);
}

describe("Notes sidebar", () => {
  it("renders the editable note and close control", () => {
    const html = renderToStaticMarkup(
      createElement(NotesSidebar, {
        notes: "Call Leslie tomorrow.",
        onClose: () => undefined,
        onNotesChange: () => undefined,
        taskTitle: "Send the invoice",
      }),
    );

    expect(html).toContain('aria-label="Notes for Send the invoice"');
    expect(html).toContain('aria-label="Close notes for Send the invoice"');
    expect(html).toContain('id="notes-rich-editor"');
    expect(html).toContain('contentEditable="true"');
    expect(html).toContain("Write notes…");
    expect(html).not.toContain('class="notes-format-hint"');
    expect(html).toContain("Send the invoice");
  });

  it("round-trips the supported rich-text syntax as markdown", () => {
    const markdown = [
      "# Plan",
      "- first",
      "- [ ] second",
      "",
      "> context",
      "",
      "**bold** and *italic* with `code` and [Leslie](https://example.com)",
    ].join("\n");

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });

  it("accepts the compact checklist shortcut shown in the editor", () => {
    expect(roundTripMarkdown("- [] follow up")).toBe("- [ ] follow up");
  });

  it("preserves nested checklist indentation in markdown", () => {
    const markdown = "- [ ] parent\n    - [ ] child";

    expect(roundTripMarkdown(markdown)).toBe(markdown);
  });
});
