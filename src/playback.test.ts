import { describe, expect, it } from "vite-plus/test";
import { playbackReducer, type Playback } from "./playback";

describe("playback transitions", () => {
  it("pauses and resumes the same task without losing elapsed time", () => {
    let state: Playback = { kind: "stopped" };
    state = playbackReducer(state, { kind: "toggle", taskId: "invoice" });
    state = playbackReducer(state, { kind: "tick" });
    state = playbackReducer(state, { kind: "toggle", taskId: "invoice" });
    expect(playbackReducer(state, { kind: "tick" })).toEqual({
      kind: "paused",
      taskId: "invoice",
      elapsedSeconds: 1,
    });
    state = playbackReducer(state, { kind: "toggle", taskId: "invoice" });
    expect(playbackReducer(state, { kind: "tick" })).toEqual({
      kind: "running",
      taskId: "invoice",
      elapsedSeconds: 2,
    });
  });

  it("resets time on task switch and ignores ticks after stop", () => {
    const state: Playback = { kind: "paused", taskId: "invoice", elapsedSeconds: 42 };
    const switched = playbackReducer(state, { kind: "toggle", taskId: "reply" });
    expect(switched).toEqual({ kind: "running", taskId: "reply", elapsedSeconds: 0 });
    const stopped = playbackReducer(switched, { kind: "stop" });
    expect(playbackReducer(stopped, { kind: "tick" })).toEqual({ kind: "stopped" });
  });
});
