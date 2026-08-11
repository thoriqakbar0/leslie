import { describe, expect, it } from "vite-plus/test";
import { folderTone } from "./folder-identity";

describe("folderTone", () => {
  it("keeps a folder tone stable and inside the supported palette", () => {
    expect(folderTone("inbox")).toBe(folderTone("inbox"));
    expect([0, 1, 2, 3]).toContain(folderTone("work"));
  });
});
