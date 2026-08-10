import { MarkdownNotesEditor } from "./MarkdownNotesEditor";

interface NotesSidebarProps {
  readonly notes: string;
  readonly onClose: () => void;
  readonly onNotesChange: (notes: string) => void;
  readonly taskTitle: string;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

/** Render task notes as a markdown-backed rich-text editor. */
export function NotesSidebar({ notes, onClose, onNotesChange, taskTitle }: NotesSidebarProps) {
  return (
    <aside aria-label={`Notes for ${taskTitle}`} className="notes-sidebar">
      <header className="notes-sidebar-header">
        <div>
          <h2>Notes</h2>
          <p>{taskTitle}</p>
        </div>
        <button aria-label={`Close notes for ${taskTitle}`} onClick={onClose} type="button">
          <CloseIcon />
        </button>
      </header>
      <div className="notes-editor">
        <p className="notes-format-hint">
          <kbd>-</kbd> list <span aria-hidden="true">·</span> <kbd>- []</kbd> checklist{" "}
          <span aria-hidden="true">·</span> <kbd>#</kbd> heading
        </p>
        <MarkdownNotesEditor
          ariaLabel={`Notes for ${taskTitle}`}
          markdown={notes}
          onEscape={onClose}
          onMarkdownChange={onNotesChange}
        />
      </div>
    </aside>
  );
}
