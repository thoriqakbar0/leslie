import { describe, expect, it } from "vite-plus/test";
import { createInitialState } from "./model";
import { documentSessionReducer, type DocumentSession } from "./document-session";

const document = createInitialState(new Date(2026, 7, 10));
function loaded(failed = false): DocumentSession {
  return documentSessionReducer({ kind: "loading" }, { kind: "loaded", document, failed });
}

describe("document persistence ownership", () => {
  it("hydrates without a dirty revision and ignores duplicate loads", () => {
    const session = loaded();
    expect(session).toMatchObject({
      kind: "ready",
      revision: 0,
      persistence: "loaded",
      warning: false,
    });
    expect(
      documentSessionReducer(session, {
        kind: "loaded",
        document: { ...document, tasks: [] },
        failed: true,
      }),
    ).toBe(session);
    expect(
      documentSessionReducer(session, {
        kind: "edited",
        event: {
          kind: "task-completed",
          id: "missing",
          historyId: "none",
          occurredAt: 0,
          createdAt: 0,
        },
      }),
    ).toBe(session);
  });

  it("keeps the warning until the current revision succeeds and ignores stale completions", () => {
    let session = documentSessionReducer(loaded(true), {
      kind: "edited",
      event: { kind: "list-selected", id: "work" },
    });
    session = documentSessionReducer(session, { kind: "save-started", revision: 1 });
    expect(session).toMatchObject({ persistence: "saving", warning: true });
    session = documentSessionReducer(session, {
      kind: "edited",
      event: { kind: "list-selected", id: "personal" },
    });
    expect(documentSessionReducer(session, { kind: "save-settled", revision: 1, ok: true })).toBe(
      session,
    );
    expect(documentSessionReducer(session, { kind: "save-started", revision: 1 })).toBe(session);
    session = documentSessionReducer(session, { kind: "save-settled", revision: 2, ok: false });
    expect(session).toMatchObject({ revision: 2, persistence: "failed", warning: true });
    session = documentSessionReducer(session, { kind: "save-settled", revision: 2, ok: true });
    expect(session).toMatchObject({
      persistence: "saved",
      warning: false,
      document: { activeListId: "personal" },
    });
  });
});
