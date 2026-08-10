import { MarkdownNotesEditor } from "./MarkdownNotesEditor";

interface NotesSidebarProps {
  readonly entryTitle: string;
  readonly notes: string;
  readonly onClose: () => void;
  readonly onNotesChange: (notes: string) => void;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

/** Render task notes as a markdown-backed rich-text editor. */
export function NotesSidebar({ entryTitle, notes, onClose, onNotesChange }: NotesSidebarProps) {
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
      </div>
    </aside>
  );
}
