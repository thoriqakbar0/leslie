import { useState } from "react";
import type { FormEvent } from "react";
import leslieMarkUrl from "../assets/leslie-mark.png";
import type { TaskList } from "../model";

interface SidebarProps {
  readonly activeListId: string;
  readonly lists: readonly TaskList[];
  readonly onAddList: (name: string) => void;
  readonly onDeleteList: (id: string) => void;
  readonly onSelectList: (id: string) => void;
}

/** Render Leslie's list switcher and inline list creator. */
export function Sidebar({
  activeListId,
  lists,
  onAddList,
  onDeleteList,
  onSelectList,
}: SidebarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newListName, setNewListName] = useState("");

  function submitNewList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    onAddList(name);
    setNewListName("");
    setIsAdding(false);
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
              <button
                aria-current={isActive ? "page" : undefined}
                className="list-select"
                onClick={() => onSelectList(list.id)}
                type="button"
              >
                {list.name}
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
    </aside>
  );
}
