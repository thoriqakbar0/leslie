import { describe, expect, it } from "vite-plus/test";
import { createInlineEdit } from "./inline-edit";

describe("inline edit sessions", () => {
  it("consumes the latest draft once even when Enter or Escape is followed by blur", () => {
    const edit = createInlineEdit<string>();
    edit.start("Original");
    edit.change("Updated");
    expect(edit.finish()).toBe("Updated");
    expect(edit.finish()).toBeNull();
    edit.change("Late change");
    expect(edit.finish()).toBeNull();
    edit.start("Next edit");
    expect(edit.finish()).toBe("Next edit");
  });

  it("keeps creation and rename drafts independent", () => {
    const creation = createInlineEdit<string>();
    const rename = createInlineEdit<string>();
    creation.start("New folder");
    rename.start("Inbox renamed");
    expect(rename.finish()).toBe("Inbox renamed");
    expect(creation.finish()).toBe("New folder");
  });
});
