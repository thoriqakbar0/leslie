import assert from "node:assert/strict";
import test from "node:test";
import {
  createTimerRunId,
  parseTimerHistory,
  recordCompletedTimer,
} from "../src/timer-history.js";

test("parses valid timer history and rejects malformed entries", () => {
  const result = parseTimerHistory([
    {
      id: "focus-1",
      kind: "focus",
      duration: 1500,
      completedAt: "2026-08-10T02:00:00.000Z",
    },
    { id: "bad", kind: "focus", duration: 0, completedAt: "not-a-date" },
  ]);

  assert.deepEqual(result, [
    {
      id: "focus-1",
      kind: "focus",
      duration: 1500,
      completedAt: "2026-08-10T02:00:00.000Z",
    },
  ]);
});

test("records completed timers newest first and only once", () => {
  const entry = {
    id: "focus-2",
    kind: "focus",
    duration: 3000,
    completedAt: "2026-08-10T03:00:00.000Z",
  };
  const original = [
    {
      id: "focus-1",
      kind: "focus",
      duration: 1500,
      completedAt: "2026-08-10T02:00:00.000Z",
    },
  ];

  assert.deepEqual(recordCompletedTimer(original, entry), [entry, ...original]);
  assert.deepEqual(recordCompletedTimer([entry, ...original], entry), [entry, ...original]);
});

test("creates deterministic run identifiers from the supplied time", () => {
  assert.equal(createTimerRunId(1234), "timer-1234");
});
