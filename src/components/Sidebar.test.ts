import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { Sidebar } from "./Sidebar";

describe("Sidebar brand", () => {
  it("renders the Leslie mark as a sized decorative image", () => {
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        activeListId: "inbox",
        lists: [{ id: "inbox", name: "Inbox" }],
        onAddList: () => undefined,
        onDeleteList: () => undefined,
        onRenameList: () => undefined,
        onSelectList: () => undefined,
      }),
    );

    expect(html).toContain('alt=""');
    expect(html).toContain('height="329"');
    expect(html).toContain('width="512"');
    expect(html).toContain('translate="no">Leslie</span>');
    expect(html).toContain('aria-label="Folders"');
    expect(html).toContain('class="sidebar-section-label">Folders</p>');
    expect(html).toContain('class="folder-icon"');
    expect(html).toContain('aria-label="Add folder"');
    expect(html).toContain("New folder");
    expect(html).toContain('title="Double-click to rename"');
    expect(html).not.toContain('aria-label="Rename Inbox"');
    expect(html).not.toContain(">Notes</button>");
    expect(html).not.toContain("Settings");
  });
});
