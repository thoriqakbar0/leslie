import type { LeslieState } from "./model";
import type { StorageResult } from "./storage";

export function createDocumentWriter(
  write: (document: LeslieState) => Promise<StorageResult<void>>,
) {
  let tail: Promise<StorageResult<void>> = Promise.resolve({ ok: true, value: undefined });
  return (document: LeslieState) => {
    tail = tail.then(() => write(document));
    return tail;
  };
}
