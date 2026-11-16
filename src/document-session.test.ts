import { describe, expect, it } from "vite-plus/test";
import { createInitialState } from "./model";
import { documentSessionReducer, type DocumentSession } from "./document-session";

const document = createInitialState(new Date(2026, 7, 10));
function loaded(): DocumentSession {
  return documentSessionReducer({ kind: "loading" }, { kind: "loaded", document });
}

describe("document persistence ownership", () => {
  it("never exposes a document or accepts edits after a failed load", () => {
    const session = documentSessionReducer({ kind: "loading" }, { kind: "load-failed" });
    expect(session).toEqual({ kind: "load-failed" });
    expect(
      documentSessionReducer(session, {
        kind: "edited",
        event: { kind: "list-selected", id: "work" },
      }),
    ).toBe(session);
    expect(
      documentSessionReducer(session, {
        kind: "save-settled",
        revision: 0,
        ok: true,
      }),
    ).toBe(session);
  });

  it("retries failed loads without allowing edits until the original document loads", () => {
    let session = documentSessionReducer({ kind: "loading" }, { kind: "load-failed" });
    session = documentSessionReducer(session, { kind: "retry-load" });
    expect(session).toEqual({ kind: "loading" });
    session = documentSessionReducer(session, { kind: "load-failed" });
    expect(session).toEqual({ kind: "load-failed" });
    session = documentSessionReducer(session, { kind: "retry-load" });
    expect(
      documentSessionReducer(session, {
        kind: "edited",
        event: { kind: "list-selected", id: "work" },
      }),
    ).toBe(session);
    const original = { ...document, activeListId: "personal" };
    session = documentSessionReducer(session, { kind: "loaded", document: original });
    expect(session).toMatchObject({
      kind: "ready",
      document: original,
      revision: 0,
      warning: false,
    });
    expect(documentSessionReducer(session, { kind: "load-failed" })).toBe(session);
  });

  it("does not discard a ready document or unsaved edits when retry is requested", () => {
    const session = documentSessionReducer(loaded(), {
      kind: "edited",
      event: { kind: "list-selected", id: "work" },
    });
    expect(documentSessionReducer(session, { kind: "retry-load" })).toBe(session);
  });

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
    let session = documentSessionReducer(loaded(), {
      kind: "edited",
      event: { kind: "list-selected", id: "work" },
    });
    session = documentSessionReducer(session, { kind: "save-settled", revision: 1, ok: false });
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
