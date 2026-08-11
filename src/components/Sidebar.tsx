import { useState } from "react";
import type { FormEvent } from "react";
import leslieMarkUrl from "../assets/leslie-mark.png";
import type { TaskList } from "../model";

interface SidebarProps {
  readonly activeListId: string;
  readonly lists: readonly TaskList[];
  readonly onAddList: (name: string) => void;
  readonly onDeleteList: (id: string) => void;
  readonly onRenameList: (id: string, name: string) => void;
  readonly onSelectList: (id: string) => void;
}

/** Render Leslie's folder switcher and inline folder creator. */
export function Sidebar({
  activeListId,
  lists,
  onAddList,
  onDeleteList,
  onRenameList,
  onSelectList,
}: SidebarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [newListName, setNewListName] = useState("");

  function submitNewList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    onAddList(name);
    setNewListName("");
    setIsAdding(false);
  }

  function startEditing(list: TaskList) {
    setEditingListId(list.id);
    setEditingListName(list.name);
  }

  function saveEdit() {
    if (editingListId === null) return;
    const name = editingListName.trim();
    if (name) onRenameList(editingListId, name);
    setEditingListId(null);
    setEditingListName("");
  }

  return (
    <aside className="sidebar">
      <div className="wordmark">
        <img alt="" height={329} src={leslieMarkUrl} width={512} />
        <span translate="no">Leslie</span>
      </div>
      <nav aria-label="Folders">
        <p className="sidebar-section-label">Folders</p>
        {lists.map((list) => {
          const isActive = activeListId === list.id;
          return (
            <div className={`list-row ${isActive ? "active" : ""}`} key={list.id}>
              {editingListId === list.id ? (
                <form
                  className="list-edit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveEdit();
                  }}
                >
                  <label className="visually-hidden" htmlFor={`list-name-${list.id}`}>
                    Folder name
                  </label>
                  <input
                    autoFocus
                    id={`list-name-${list.id}`}
                    onBlur={saveEdit}
                    onChange={(event) => setEditingListName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Escape") return;
                      event.preventDefault();
                      setEditingListId(null);
                      setEditingListName("");
                    }}
                    value={editingListName}
                  />
                </form>
              ) : (
                <>
                  <button
                    aria-current={isActive ? "page" : undefined}
                    className="list-select"
                    onClick={() => onSelectList(list.id)}
                    onDoubleClick={() => startEditing(list)}
                    title="Double-click to rename"
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="folder-icon"
                      focusable="false"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 7.5h6l2 2h10v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Zm0 0v-1.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1.5" />
                    </svg>
                    <span>{list.name}</span>
                  </button>
                  {isActive && lists.length > 1 ? (
                    <div className="list-actions">
                      <button
                        aria-label={`Delete folder ${list.name}`}
                        className="delete-list"
                        onClick={() => onDeleteList(list.id)}
                        type="button"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
        {isAdding ? (
          <form className="new-list" onSubmit={submitNewList}>
            <label className="visually-hidden" htmlFor="new-list-name">
              New folder name
            </label>
            <input
              autoFocus
              id="new-list-name"
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="Folder name"
              value={newListName}
            />
            <button aria-label="Create folder" className="new-list-submit" type="submit">
              +
            </button>
          </form>
        ) : (
          <button
            aria-label="Add folder"
            className="add-list"
            onClick={() => setIsAdding(true)}
            type="button"
          >
            <span aria-hidden="true">+</span>
            <span>New folder</span>
          </button>
        )}
      </nav>
    </aside>
  );
}
