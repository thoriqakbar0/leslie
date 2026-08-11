import { describe, expect, it } from "vite-plus/test";
import { parseEntryLabels } from "./entry-labels";

describe("parseEntryLabels", () => {
  it("extracts unique labels and cleans the entry text", () => {
    expect(parseEntryLabels("Finish report @work @urgent @work")).toEqual({
      labels: ["@work", "@urgent"],
      parts: [
        { kind: "text", value: "Finish report " },
        { kind: "label", value: "@work" },
        { kind: "text", value: " " },
        { kind: "label", value: "@urgent" },
        { kind: "text", value: " " },
      ],
      text: "Finish report",
    });
  });

  it("does not turn email addresses into labels", () => {
    expect(parseEntryLabels("Email alex@example.com @follow-up")).toEqual({
      labels: ["@follow-up"],
      parts: [
        { kind: "text", value: "Email alex@example.com " },
        { kind: "label", value: "@follow-up" },
      ],
      text: "Email alex@example.com",
    });
  });

  it("keeps sentence punctuation tidy after a label", () => {
    expect(parseEntryLabels("Completed report @work.")).toEqual({
      labels: ["@work"],
      parts: [
        { kind: "text", value: "Completed report " },
        { kind: "label", value: "@work" },
        { kind: "text", value: "." },
      ],
      text: "Completed report.",
    });
  });
});
