import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import {
  completePlannedClock,
  ESTIMATE_OPTIONS,
  formatDuration,
  parseEstimate,
  parsePlannedDuration,
} from "../model";
import type { EntryMode, EstimateMinutes } from "../model";
import { parsePlannedInput } from "../planning";

interface CaptureComposerProps {
  readonly captureInputRef: RefObject<HTMLInputElement | null>;
  readonly mode: EntryMode;
  readonly onAddPlanned: (
    title: string,
    estimatedMinutes: EstimateMinutes,
    scheduledAt: number,
  ) => void;
  readonly onAddWorkLog: (note: string) => void;
  readonly onModeChange: (mode: EntryMode) => void;
  readonly planningLocales: readonly string[];
  readonly planningReference: Date;
}

/** Render one keyboard-first composer for planned work and completed work. */
export function CaptureComposer({
  captureInputRef,
  mode,
  onAddPlanned,
  onAddWorkLog,
  onModeChange,
  planningLocales,
  planningReference,
}: CaptureComposerProps) {
  const [text, setText] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<EstimateMinutes>(30);
  const pendingSelection = useRef<{ readonly start: number; readonly end: number } | null>(null);

  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    if (selection === null) return;
    captureInputRef.current?.setSelectionRange(selection.start, selection.end);
    pendingSelection.current = null;
  }, [captureInputRef, text]);

  useEffect(() => {
    function selectEntryMode(event: KeyboardEvent) {
      if (event.defaultPrevented || event.isComposing) return;
      const togglesMode =
        event.metaKey &&
        event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        event.key.toLowerCase() === "m";
      if (togglesMode) {
        event.preventDefault();
        onModeChange(mode === "planned" ? "did" : "planned");
      }
    }

    globalThis.document.addEventListener("keydown", selectEntryMode);
    return () => globalThis.document.removeEventListener("keydown", selectEntryMode);
  }, [mode, onModeChange]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    if (mode === "did") {
      onAddWorkLog(cleanText);
    } else {
      const planned = parsePlannedInput(
        cleanText,
        estimatedMinutes,
        planningReference,
        planningLocales,
      );
      onAddPlanned(planned.title, planned.estimatedMinutes, planned.scheduledAt);
    }
    setText("");
  }

  return (
    <section className="capture-section" aria-label="Quick capture">
      <form className={`capture-box ${mode}`} onSubmit={submit}>
        <div className="capture-mode">
          <button
            aria-keyshortcuts="Meta+Shift+M"
            aria-label={`Entry type: ${mode}. Switch to ${mode === "planned" ? "did" : "planned"}`}
            className="entry-mode-switch"
            onClick={() => onModeChange(mode === "planned" ? "did" : "planned")}
            type="button"
          >
            <span aria-hidden="true">{mode === "planned" ? "Planned" : "Did"}</span>
            <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
              <path d="m6 7 2-2 2 2M8 5v8M14 13l-2 2-2-2M12 15V7" />
            </svg>
          </button>
        </div>

        <label className="visually-hidden" htmlFor="capture-input">
          {mode === "did" ? "What did you do?" : "What do you plan to do?"}
        </label>
        <input
          aria-describedby="capture-hint"
          autoComplete="off"
          id="capture-input"
          name="capture-entry"
          onChange={(event) => {
            const nextText = event.target.value;
            const completion = mode === "planned" ? completePlannedClock(nextText) : null;
            const completedText = completion?.value ?? nextText;
            pendingSelection.current = completion
              ? { start: completion.selectionStart, end: completion.selectionEnd }
              : null;
            setText(completedText);
            if (mode === "planned") {
              setEstimatedMinutes(
                parsePlannedDuration(completedText, estimatedMinutes).estimatedMinutes,
              );
            }
          }}
          placeholder={mode === "did" ? "e.g. Reviewed the invoice…" : "e.g. Call at 8:30…"}
          ref={captureInputRef}
          type="text"
          value={text}
        />

        {mode === "planned" ? (
          <>
            <label className="visually-hidden" htmlFor="capture-estimate">
              Expected time
            </label>
            <select
              id="capture-estimate"
              onChange={(event) => {
                const estimate = parseEstimate(event.target.value);
                if (estimate !== null) setEstimatedMinutes(estimate);
              }}
              value={estimatedMinutes}
            >
              {ESTIMATE_OPTIONS.map((estimate) => (
                <option key={estimate} value={estimate}>
                  {formatDuration(estimate)}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <button className="capture-submit" type="submit">
          Add
        </button>
      </form>
      <p className="capture-hint" id="capture-hint">
        <kbd>⌘⇧M</kbd> switches entry type <span aria-hidden="true">·</span> <kbd>enter</kbd> adds
        it
        {mode === "planned" ? (
          <>
            {" "}
            <span aria-hidden="true">·</span> type <kbd>8:</kbd> to complete <kbd>08:00</kbd>
          </>
        ) : null}{" "}
        <span aria-hidden="true">·</span> type <kbd>@work</kbd> to add a label
      </p>
    </section>
  );
}
