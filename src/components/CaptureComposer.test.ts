import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { CaptureComposer } from "./CaptureComposer";

function renderComposer() {
  const captureInputRef = { current: null };
  return renderToStaticMarkup(
    createElement(CaptureComposer, {
      captureInputRef,
      mode: "did",
      onAddPlanned: () => undefined,
      onAddWorkLog: () => undefined,
      onModeChange: () => undefined,
    }),
  );
}

describe("CaptureComposer keyboard access", () => {
  it("exposes both entry modes as pressed buttons in source order", () => {
    const html = renderComposer();
    const didIndex = html.indexOf(">Did</button>");
    const plannedIndex = html.indexOf(">Planned</button>");
    const inputIndex = html.indexOf('id="capture-input"');
    const addIndex = html.indexOf(">Add</button>");

    expect(didIndex).toBeLessThan(plannedIndex);
    expect(plannedIndex).toBeLessThan(inputIndex);
    expect(inputIndex).toBeLessThan(addIndex);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("describes the entry-mode shortcut from the named input", () => {
    const html = renderComposer();

    expect(html).toContain('name="capture-entry"');
    expect(html).toContain('aria-describedby="capture-hint"');
    expect(html).toContain("tab</kbd> switches Did/Planned");
  });
});
