export type Playback =
  | { readonly kind: "stopped" }
  | {
      readonly kind: "running" | "paused";
      readonly taskId: string;
      readonly elapsedSeconds: number;
    };

export type PlaybackEvent =
  | { readonly kind: "toggle"; readonly taskId: string }
  | { readonly kind: "tick" }
  | { readonly kind: "stop" };

export function playbackReducer(state: Playback, event: PlaybackEvent): Playback {
  switch (event.kind) {
    case "toggle":
      if (state.kind === "stopped" || state.taskId !== event.taskId) {
        return { kind: "running", taskId: event.taskId, elapsedSeconds: 0 };
      }
      return { ...state, kind: state.kind === "running" ? "paused" : "running" };
    case "tick":
      return state.kind === "running"
        ? { ...state, elapsedSeconds: state.elapsedSeconds + 1 }
        : state;
    case "stop":
      return { kind: "stopped" };
  }
}
