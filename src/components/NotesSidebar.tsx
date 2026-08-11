import { MarkdownNotesEditor } from "./MarkdownNotesEditor";
import { formatCompactTime } from "../model";
import type { ActivityHistoryEntry } from "../model";

interface NotesSidebarProps {
  readonly entryTitle: string;
  readonly history: readonly ActivityHistoryEntry[];
  readonly notes: string;
  readonly onClose: () => void;
  readonly onNotesChange: (notes: string) => void;
}

const historyDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function historyDescription(entry: ActivityHistoryEntry): string {
  switch (entry.type) {
    case "planned-created":
      return `Planned “${entry.title}”`;
    case "did-created":
      return `Recorded “${entry.title}”`;
    case "planned-completed":
      return `Completed “${entry.title}”`;
    case "title-changed":
      return `Renamed ${entry.itemKind} from “${entry.previousTitle}” to “${entry.title}”`;
  }
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

/** Render task notes as a markdown-backed rich-text editor. */
export function NotesSidebar({
  entryTitle,
  history,
  notes,
  onClose,
  onNotesChange,
}: NotesSidebarProps) {
  const sortedHistory = [...history].sort((left, right) => right.occurredAt - left.occurredAt);
  return (
    <aside aria-label={`Notes for ${entryTitle}`} className="notes-sidebar">
      <header className="notes-sidebar-header">
        <div>
          <h2>Notes</h2>
          <p>{entryTitle}</p>
        </div>
        <button aria-label={`Close notes for ${entryTitle}`} onClick={onClose} type="button">
          <CloseIcon />
        </button>
      </header>
      <div className="notes-editor">
        <MarkdownNotesEditor
          ariaLabel={`Notes for ${entryTitle}`}
          markdown={notes}
          onEscape={onClose}
          onMarkdownChange={onNotesChange}
        />
        <section aria-labelledby="notes-history-title" className="notes-history">
          <header className="notes-history-header">
            <h3 id="notes-history-title">History</h3>
            {sortedHistory.length > 0 ? (
              <span>
                {sortedHistory.length} {sortedHistory.length === 1 ? "change" : "changes"}
              </span>
            ) : null}
          </header>
          {sortedHistory.length > 0 ? (
            <ol className="notes-history-timeline">
              {sortedHistory.map((entry) => (
                <li key={entry.id}>
                  <span aria-hidden="true" className="notes-history-marker" />
                  <div>
                    <p>{historyDescription(entry)}</p>
                    <time dateTime={new Date(entry.occurredAt).toISOString()}>
                      {historyDateFormatter.format(entry.occurredAt)} ·{" "}
                      {formatCompactTime(entry.occurredAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="notes-history-empty">No changes recorded for this item yet.</p>
          )}
        </section>
      </div>
    </aside>
  );
}
