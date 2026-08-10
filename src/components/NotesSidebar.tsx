import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { notesHtmlToMarkdown, notesMarkdownToHtml } from "../notes-markdown";

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

function placeCaretAtEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Render task notes as a markdown-backed rich-text editor. */
export function NotesSidebar({ notes, onClose, onNotesChange, taskTitle }: NotesSidebarProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastNotes = useRef<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastNotes.current === notes) return;
    const isFirstRender = lastNotes.current === null;
    editor.innerHTML = notesMarkdownToHtml(notes);
    lastNotes.current = notes;
    if (isFirstRender) editor.focus();
  }, [notes]);

  function emitNotes() {
    const editor = editorRef.current;
    if (!editor) return;
    const markdown = notesHtmlToMarkdown(editor);
    lastNotes.current = markdown;
    onNotesChange(markdown);
  }

  function transformMarkdownShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    const selection = globalThis.getSelection();
    const anchor = selection?.anchorNode;
    const editor = editorRef.current;
    const element = anchor instanceof Element ? anchor : anchor?.parentElement;
    const checklistItem = element?.closest(".rich-checklist li");
    if (
      event.key === "Enter" &&
      checklistItem instanceof HTMLElement &&
      editor?.contains(checklistItem)
    ) {
      event.preventDefault();
      const list = checklistItem.parentElement;
      if (checklistItem.textContent?.trim()) {
        const nextItem = checklistItem.cloneNode(false) as HTMLLIElement;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.contentEditable = "false";
        checkbox.setAttribute("aria-label", "Checklist item");
        nextItem.append(checkbox);
        checklistItem.after(nextItem);
        placeCaretAtEnd(nextItem);
      } else if (list) {
        const paragraph = document.createElement("p");
        paragraph.append(document.createElement("br"));
        list.after(paragraph);
        checklistItem.remove();
        if (list.children.length === 0) list.remove();
        placeCaretAtEnd(paragraph);
      }
      emitNotes();
      return;
    }
    if (event.key !== " ") return;
    const block = element?.closest("p, div");
    if (!block || !editor?.contains(block)) return;
    const marker = block.textContent;
    if (!["-", "- []", "- [ ]", "#", "##", ">"].includes(marker ?? "")) return;

    event.preventDefault();
    if (marker === "-" || marker === "- []" || marker === "- [ ]") {
      const list = document.createElement("ul");
      const item = document.createElement("li");
      if (marker !== "-") {
        list.className = "rich-checklist";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.contentEditable = "false";
        checkbox.setAttribute("aria-label", "Checklist item");
        item.append(checkbox);
      }
      list.append(item);
      block.replaceWith(list);
      placeCaretAtEnd(item);
    } else {
      const tagName = marker === "#" ? "h2" : marker === "##" ? "h3" : "blockquote";
      const replacement = document.createElement(tagName);
      block.replaceWith(replacement);
      placeCaretAtEnd(replacement);
    }
    emitNotes();
  }

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
        <div
          aria-label={`Notes for ${taskTitle}`}
          aria-multiline="true"
          autoFocus
          className="rich-notes-editor"
          contentEditable
          data-placeholder="Write notes…"
          id="notes-rich-editor"
          onInput={emitNotes}
          onKeyDown={transformMarkdownShortcut}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          }}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>
    </aside>
  );
}
