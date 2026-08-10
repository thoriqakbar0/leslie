import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { PlaybackBar } from "./PlaybackBar";

describe("PlaybackBar", () => {
  it("stays hidden until a task starts", () => {
    const html = renderToStaticMarkup(
      createElement(PlaybackBar, {
        elapsedSeconds: 0,
        isPlaying: false,
        task: null,
        onStop: () => undefined,
        onToggle: () => undefined,
      }),
    );

    expect(html).toBe("");
  });

  it("shows the active task and elapsed time", () => {
    const html = renderToStaticMarkup(
      createElement(PlaybackBar, {
        elapsedSeconds: 65,
        isPlaying: true,
        task: {
          id: "task-one",
          listId: "inbox",
          title: "Send the invoice",
          notes: "",
          estimatedMinutes: 30,
          scheduledAt: 100,
        },
        onStop: () => undefined,
        onToggle: () => undefined,
      }),
    );

    expect(html).toContain("Now playing");
    expect(html).toContain("Send the invoice");
    expect(html).toContain("1:05");
    expect(html).toContain("of 30 min");
  });
});
