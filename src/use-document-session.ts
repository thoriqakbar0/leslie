import { useCallback, useEffect, useReducer, useState } from "react";
import { createInitialState } from "./model";
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

  useEffect(() => {
    let current = true;
    void loadState().then((result) => {
      if (!current) return;
      dispatch({
        kind: "loaded",
        document: result.ok ? result.value : createInitialState(),
        failed: !result.ok,
      });
    });
    return () => {
      current = false;
    };
  }, []);

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

  return { document, sendDocument, storageFailed: session.kind === "ready" && session.warning };
}
