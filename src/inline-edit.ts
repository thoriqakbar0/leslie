import { useRef, useState } from "react";

export type InlineEdit<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "editing"; readonly draft: T };

export function createInlineEdit<T>() {
  let state: InlineEdit<T> = { kind: "idle" };
  return {
    get state() {
      return state;
    },
    start(draft: T) {
      state = { kind: "editing", draft };
    },
    change(draft: T) {
      if (state.kind === "editing") state = { kind: "editing", draft };
    },
    finish(): T | null {
      if (state.kind === "idle") return null;
      const { draft } = state;
      state = { kind: "idle" };
      return draft;
    },
  };
}

export function useInlineEdit<T>() {
  const session = useRef(createInlineEdit<T>()).current;
  const [state, setState] = useState(session.state);
  return {
    draft: state.kind === "editing" ? state.draft : null,
    start(draft: T) {
      session.start(draft);
      setState(session.state);
    },
    change(draft: T) {
      session.change(draft);
      setState(session.state);
    },
    finish() {
      // Claim the draft before a keyboard action can trigger blur in the same render.
      const draft = session.finish();
      setState(session.state);
      return draft;
    },
  };
}
