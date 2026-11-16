import { describe, expect, it } from "vite-plus/test";
import { createInitialState } from "./model";
import { createDocumentWriter } from "./document-writer";
import { LocalDatabaseError, type StorageResult } from "./storage";

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error("Promise not initialized");
  };
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe("document write queue", () => {
  it("serializes snapshots and continues after a failed write", async () => {
    const first = deferred<StorageResult<void>>();
    const second = deferred<StorageResult<void>>();
    const calls: string[] = [];
    const write = createDocumentWriter((document) => {
      calls.push(document.activeListId);
      return calls.length === 1 ? first.promise : second.promise;
    });
    const document = createInitialState();
    const saveFirst = write({ ...document, activeListId: "work" });
    const saveSecond = write({ ...document, activeListId: "personal" });
    await Promise.resolve();
    expect(calls).toEqual(["work"]);
    first.resolve({ ok: false, error: new LocalDatabaseError("write") });
    expect((await saveFirst).ok).toBe(false);
    await Promise.resolve();
    expect(calls).toEqual(["work", "personal"]);
    second.resolve({ ok: true, value: undefined });
    expect((await saveSecond).ok).toBe(true);
  });
});
