import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { CaptureComposer } from "./CaptureComposer";

function renderComposer() {
  const captureInputRef = { current: null };
  return renderToStaticMarkup(
    createElement(CaptureComposer, {
      captureInputRef,
      mode: "planned",
      onAddPlanned: () => undefined,
      onAddWorkLog: () => undefined,
      onModeChange: () => undefined,
      planningLocales: ["en"],
      planningReference: new Date(2026, 7, 10, 14, 0),
    }),
  );
}

describe("CaptureComposer keyboard access", () => {
  it("puts task writing before secondary post controls", () => {
    const html = renderComposer();
    const switchIndex = html.indexOf('class="entry-mode-switch"');
    const inputIndex = html.indexOf('id="capture-input"');
    const postIndex = html.indexOf(">Post</button>");

    expect(switchIndex).toBeGreaterThan(-1);
    expect(inputIndex).toBeLessThan(switchIndex);
    expect(switchIndex).toBeLessThan(postIndex);
    expect(html).toContain('aria-keyshortcuts="Meta+Shift+M"');
    expect(html).toContain('aria-label="Post type: task. Switch to work log"');
    expect(html).toContain(">Task</span>");
    expect(html).toContain('placeholder="What needs doing?"');
  });

  it("describes native keyboard traversal from the named input", () => {
    const html = renderComposer();

    expect(html).toContain('name="capture-entry"');
    expect(html).toContain('aria-describedby="capture-hint"');
    expect(html).toContain('aria-keyshortcuts="C Escape"');
    expect(html).toContain('autofocus=""');
    expect(html).toContain("<kbd>c</kbd> focus");
    expect(html).toContain("<kbd>esc</kbd> unfocus");
    expect(html).toContain("<kbd>enter</kbd> post");
    expect(html).toContain("<kbd>⌘⇧M</kbd> switches post type");
  });
});
