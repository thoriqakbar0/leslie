import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { notesMarkdownToHtml } from "../notes-markdown";
import { NotesSidebar } from "./NotesSidebar";

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
    expect(html).toContain('data-placeholder="Write notes…"');
    expect(html).toContain("- []</kbd> checklist");
    expect(html).toContain("Send the invoice");
  });

  it("renders markdown as rich notes without storing html", () => {
    expect(notesMarkdownToHtml("# Plan\n- first\n- [ ] second")).toContain(
      '<h2>Plan</h2><ul><li>first</li></ul><ul class="rich-checklist">',
    );
    expect(notesMarkdownToHtml("**bold** and *italic*")).toContain(
      "<strong>bold</strong> and <em>italic</em>",
    );
  });
});
