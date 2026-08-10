import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("renders one six-week keyboard calendar for the selected month", () => {
    const html = renderToStaticMarkup(
      createElement(DatePicker, {
        onClose: () => undefined,
        onSelect: () => undefined,
        selectedDate: new Date(2026, 7, 10, 14, 30),
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Choose date"');
    expect(html).toContain("August 2026");
    expect(html).toContain('aria-current="date"');
    expect(html.match(/data-calendar-day=""/g)).toHaveLength(42);
  });
});
