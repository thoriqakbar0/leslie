import { useCallback, useEffect, useReducer, useState } from "react";
import { documentSessionReducer, type DocumentSession } from "./document-session";
import { createDocumentWriter } from "./document-writer";
import type { DocumentEvent } from "./document-transitions";
import { loadState, saveState } from "./storage";

export function useDocumentSession() {
  const [session, dispatch] = useReducer(documentSessionReducer, {
    kind: "loading",
  } satisfies DocumentSession);
  const [saveDocument] = useState(() => createDocumentWriter(saveState));
  const document = session.kind === "ready" ? session.document : null;
  const revision = session.kind === "ready" ? session.revision : 0;
  const isLoading = session.kind === "loading";

  useEffect(() => {
    if (!isLoading) return;
    let current = true;
    void loadState().then((result) => {
      if (!current) return;
      dispatch(result.ok ? { kind: "loaded", document: result.value } : { kind: "load-failed" });
    });
    return () => {
      current = false;
    };
  }, [isLoading]);

  useEffect(() => {
    if (document === null || revision === 0) return;
    let current = true;
    dispatch({ kind: "save-started", revision });
    void saveDocument(document).then((result) => {
      if (current) dispatch({ kind: "save-settled", revision, ok: result.ok });
    });
    return () => {
      current = false;
    };
  }, [document, revision, saveDocument]);

  const sendDocument = useCallback((event: DocumentEvent) => {
    dispatch({ kind: "edited", event });
  }, []);

  const retryLoad = useCallback(() => {
    dispatch({ kind: "retry-load" });
  }, []);

  return {
    document,
    sendDocument,
    retryLoad,
    loadFailed: session.kind === "load-failed",
    storageFailed: session.kind === "ready" && session.warning,
  };
}
