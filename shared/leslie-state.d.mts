import type { LeslieState } from "../src/model";

/** Parse unknown input into a complete Leslie state, or return null when any invariant fails. */
export function parseLeslieState(value: unknown): LeslieState | null;
