import { describe, expect, it } from "vite-plus/test";
import { parseEntryLabels } from "./entry-labels";

describe("parseEntryLabels", () => {
  it("extracts unique labels and cleans the entry text", () => {
    expect(parseEntryLabels("Finish report @work @urgent @work")).toEqual({
      labels: ["@work", "@urgent"],
      text: "Finish report",
    });
  });

  it("does not turn email addresses into labels", () => {
    expect(parseEntryLabels("Email alex@example.com @follow-up")).toEqual({
      labels: ["@follow-up"],
      text: "Email alex@example.com",
    });
  });

  it("keeps sentence punctuation tidy after a label", () => {
    expect(parseEntryLabels("Completed report @work.")).toEqual({
      labels: ["@work"],
      text: "Completed report.",
    });
  });
});
