import { useState } from "react";
import type { FormEvent } from "react";
import { ESTIMATE_OPTIONS, formatDuration, parseEstimate, parsePlannedInput } from "../model";
import type { EntryMode, EstimateMinutes } from "../model";

interface CaptureComposerProps {
  readonly onAddPlanned: (title: string, estimatedMinutes: EstimateMinutes) => void;
  readonly onAddWorkLog: (note: string) => void;
}

/** Render one keyboard-first composer for planned work and completed work. */
export function CaptureComposer({ onAddPlanned, onAddWorkLog }: CaptureComposerProps) {
  const [mode, setMode] = useState<EntryMode>("did");
  const [text, setText] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<EstimateMinutes>(30);

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
            onClick={() => setMode("did")}
            type="button"
          >
            Did
          </button>
          <button
            aria-pressed={mode === "planned"}
            className={mode === "planned" ? "active" : ""}
            onClick={() => setMode("planned")}
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
            setText(nextText);
            if (mode === "planned") {
              setEstimatedMinutes(parsePlannedInput(nextText, estimatedMinutes).estimatedMinutes);
            }
          }}
          placeholder={
            mode === "did" ? "e.g. Reviewed the invoice…" : "e.g. Send invoice in 30 min…"
          }
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
        <kbd>tab</kbd> moves through controls <span aria-hidden="true">·</span> <kbd>enter</kbd>{" "}
        adds it
      </p>
    </section>
  );
}
