interface NotesSidebarProps {
  readonly notes: string;
  readonly onClose: () => void;
  readonly onNotesChange: (notes: string) => void;
  readonly taskTitle: string;
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

/** Render the right-aligned notes panel and its editable text area. */
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
        <label className="visually-hidden" htmlFor="notes-textarea">
          Notes for {taskTitle}
        </label>
        <textarea
          autoFocus
          id="notes-textarea"
          onChange={(event) => onNotesChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          placeholder="Write notes…"
          value={notes}
        />
      </div>
    </aside>
  );
}
