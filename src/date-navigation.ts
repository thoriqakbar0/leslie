import { moveScaleDate, timestampOnDate, type TimeScale } from "./model";

export interface DateNavigation {
  readonly timeScale: TimeScale;
  readonly anchorTimestamp: number;
  readonly motion: "next" | "previous" | "reset";
}

export type DateNavigationEvent =
  | { readonly kind: "move"; readonly direction: -1 | 1 }
  | { readonly kind: "select"; readonly date: Date }
  | { readonly kind: "scale"; readonly scale: TimeScale };

export function dateNavigationReducer(
  state: DateNavigation,
  event: DateNavigationEvent,
): DateNavigation {
  switch (event.kind) {
    case "move":
      return {
        ...state,
        anchorTimestamp: moveScaleDate(
          new Date(state.anchorTimestamp),
          state.timeScale,
          event.direction,
        ).getTime(),
        motion: event.direction === -1 ? "previous" : "next",
      };
    case "select": {
      const anchorTimestamp = timestampOnDate(event.date, new Date(state.anchorTimestamp));
      return {
        ...state,
        anchorTimestamp,
        motion: anchorTimestamp < state.anchorTimestamp ? "previous" : "next",
      };
    }
    case "scale":
      return { ...state, timeScale: event.scale, motion: "reset" };
  }
}
