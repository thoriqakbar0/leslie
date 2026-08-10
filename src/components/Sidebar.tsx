import { useState } from "react";
import type { FormEvent } from "react";
import leslieMarkUrl from "../assets/leslie-mark.png";
import type { TaskList } from "../model";

interface SidebarProps {
  readonly activeListId: string | null;
  readonly isSettingsActive: boolean;
  readonly lists: readonly TaskList[];
  readonly onAddList: (name: string) => void;
  readonly onDeleteList: (id: string) => void;
  readonly onOpenSettings: () => void;
  readonly onRenameList: (id: string, name: string) => void;
  readonly onSelectList: (id: string) => void;
}

/** Render Leslie's list switcher and inline list creator. */
export function Sidebar({
  activeListId,
  isSettingsActive,
  lists,
  onAddList,
  onDeleteList,
  onOpenSettings,
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
      <nav aria-label="Lists">
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
                    List name
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
                    type="button"
                  >
                    {list.name}
                  </button>
                  <div className="list-actions">
                    <button
                      aria-label={`Rename ${list.name}`}
                      className="rename-list"
                      onClick={() => startEditing(list)}
                      type="button"
                    >
                      <span aria-hidden="true">✎</span>
                    </button>
                    {isActive && lists.length > 1 ? (
                      <button
                        aria-label={`Delete ${list.name}`}
                        className="delete-list"
                        onClick={() => onDeleteList(list.id)}
                        type="button"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          );
        })}
        {isAdding ? (
          <form className="new-list" onSubmit={submitNewList}>
            <label className="visually-hidden" htmlFor="new-list-name">
              New list name
            </label>
            <input
              autoFocus
              id="new-list-name"
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="List name"
              value={newListName}
            />
            <button aria-label="Create list" className="new-list-submit" type="submit">
              +
            </button>
          </form>
        ) : (
          <button
            aria-label="Add list"
            className="add-list"
            onClick={() => setIsAdding(true)}
            type="button"
          >
            +
          </button>
        )}
      </nav>
      <button
        aria-current={isSettingsActive ? "page" : undefined}
        className={`sidebar-settings ${isSettingsActive ? "active" : ""}`}
        onClick={onOpenSettings}
        type="button"
      >
        Settings
      </button>
    </aside>
  );
}
