import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import {
  completePlannedClock,
  ESTIMATE_OPTIONS,
  formatDuration,
  parseEstimate,
  parsePlannedInput,
} from "../model";
import type { EntryMode, EstimateMinutes } from "../model";

interface CaptureComposerProps {
  readonly captureInputRef: RefObject<HTMLInputElement | null>;
  readonly mode: EntryMode;
  readonly onAddPlanned: (title: string, estimatedMinutes: EstimateMinutes) => void;
  readonly onAddWorkLog: (note: string) => void;
  readonly onModeChange: (mode: EntryMode) => void;
}

/** Render one keyboard-first composer for planned work and completed work. */
export function CaptureComposer({
  captureInputRef,
  mode,
  onAddPlanned,
  onAddWorkLog,
  onModeChange,
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    if (mode === "did") {
      onAddWorkLog(cleanText);
    } else {
      const planned = parsePlannedInput(cleanText, estimatedMinutes);
      onAddPlanned(planned.title, planned.estimatedMinutes);
    }
    setText("");
  }

  return (
    <section className="capture-section" aria-label="Quick capture">
      <form className={`capture-box ${mode}`} onSubmit={submit}>
        <div className="capture-mode" aria-label="Entry type" role="group">
          <button
            aria-pressed={mode === "did"}
            className={mode === "did" ? "active" : ""}
            onClick={() => onModeChange("did")}
            onFocus={() => onModeChange("did")}
            type="button"
          >
            Did
          </button>
          <button
            aria-pressed={mode === "planned"}
            className={mode === "planned" ? "active" : ""}
            onClick={() => onModeChange("planned")}
            onFocus={() => onModeChange("planned")}
            type="button"
          >
            Planned
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
                parsePlannedInput(completedText, estimatedMinutes).estimatedMinutes,
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
        <kbd>tab</kbd> switches Did/Planned <span aria-hidden="true">·</span> <kbd>enter</kbd> adds
        it
        {mode === "planned" ? (
          <>
            {" "}
            <span aria-hidden="true">·</span> type <kbd>8:</kbd> to complete <kbd>08:00</kbd>
          </>
        ) : null}
      </p>
    </section>
  );
}
