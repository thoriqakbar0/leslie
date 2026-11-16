import type { LeslieState } from "./model";
import { documentReducer, type DocumentEvent } from "./document-transitions";

export type DocumentSession =
  | { readonly kind: "loading" }
  | {
      readonly kind: "ready";
      readonly document: LeslieState;
      readonly revision: number;
      readonly persistence: "loaded" | "dirty" | "saving" | "saved" | "failed";
      readonly warning: boolean;
    };

export type DocumentSessionEvent =
  | { readonly kind: "loaded"; readonly document: LeslieState; readonly failed: boolean }
  | { readonly kind: "edited"; readonly event: DocumentEvent }
  | { readonly kind: "save-started"; readonly revision: number }
  | { readonly kind: "save-settled"; readonly revision: number; readonly ok: boolean };

export function documentSessionReducer(
  state: DocumentSession,
  event: DocumentSessionEvent,
): DocumentSession {
  if (event.kind === "loaded") {
    return state.kind === "loading"
      ? {
          kind: "ready",
          document: event.document,
          revision: 0,
          persistence: event.failed ? "failed" : "loaded",
          warning: event.failed,
        }
      : state;
  }
  if (state.kind === "loading") return state;
  switch (event.kind) {
    case "edited": {
      const document = documentReducer(state.document, event.event);
      return document === state.document
        ? state
        : { ...state, document, revision: state.revision + 1, persistence: "dirty" };
    }
    case "save-started":
      return event.revision === state.revision ? { ...state, persistence: "saving" } : state;
    case "save-settled":
      return event.revision === state.revision
        ? { ...state, persistence: event.ok ? "saved" : "failed", warning: !event.ok }
        : state;
  }
}
