import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
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
    expect(html).toContain('id="notes-textarea"');
    expect(html).toContain('placeholder="Write notes…"');
    expect(html).toContain("Call Leslie tomorrow.");
    expect(html).toContain("Send the invoice");
  });
});
