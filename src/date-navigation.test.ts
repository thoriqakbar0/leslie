import { describe, expect, it } from "vite-plus/test";
import { dateNavigationReducer, type DateNavigation } from "./date-navigation";

describe("date navigation", () => {
  it("moves in the selected scale and resets motion on scale changes", () => {
    const state: DateNavigation = {
      timeScale: "day",
      anchorTimestamp: new Date(2026, 0, 31, 14, 25).getTime(),
      motion: "reset",
    };
    const monthly = dateNavigationReducer(state, { kind: "scale", scale: "month" });
    expect(monthly.motion).toBe("reset");
    const next = dateNavigationReducer(monthly, { kind: "move", direction: 1 });
    expect(new Date(next.anchorTimestamp)).toEqual(new Date(2026, 1, 28, 14, 25));
    expect(next.motion).toBe("next");
    expect(dateNavigationReducer(next, { kind: "move", direction: -1 }).motion).toBe("previous");
  });

  it("selects a date while preserving the anchor clock and choosing motion", () => {
    const state: DateNavigation = {
      timeScale: "week",
      anchorTimestamp: new Date(2026, 7, 10, 14, 25, 12).getTime(),
      motion: "reset",
    };
    const selected = dateNavigationReducer(state, { kind: "select", date: new Date(2026, 7, 8) });
    expect(new Date(selected.anchorTimestamp)).toEqual(new Date(2026, 7, 8, 14, 25, 12));
    expect(selected.timeScale).toBe("week");
    expect(selected.motion).toBe("previous");
  });
});
