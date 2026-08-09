import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  CaretDown,
  CaretUp,
  Check,
  DotsThree,
  FolderOpen,
  FolderSimple,
  Moon,
  NotePencil,
  Pause,
  PencilSimple,
  Play,
  Plus,
  PushPinSimple,
  Sun,
  X,
} from "@phosphor-icons/react";

const STORAGE_KEY = "focus-dock-prototype-v3";
const THEME_KEY = "focus-dock-theme";
const DEFAULT_DURATION = 25 * 60;

const defaultState = {
  title: "Onboarding flow",
  purpose:
    "Simplify the first-run experience and prepare the next design review.",
  duration: DEFAULT_DURATION,
  remaining: 24 * 60 + 18,
  timerStatus: "running",
  timerKind: "focus",
  endsAt: Date.now() + (24 * 60 + 18) * 1000,
  selectedNoteId: "session",
  loadedNoteIds: ["session", "ideas"],
  folders: [
    { id: "onboarding", name: "Onboarding flow" },
    { id: "backlog", name: "Backlog" },
  ],
  notes: [
    {
      id: "session",
      name: "session",
      folderId: "onboarding",
      content:
        "Goal: Outline the onboarding flow update\n\n- Review analytics from new users\n- Simplify permission screen\n- Add contextual tips on step 2\n- Validate copy with design\n\nBlocked: waiting on final copy from content team",
    },
    {
      id: "ideas",
      name: "ideas",
      folderId: "onboarding",
      content:
        "Try a shorter welcome screen.\n\nMove permissions closer to the feature that needs them.\n\nUse one clear example before the first empty state.",
    },
    {
      id: "later",
      name: "later",
      folderId: "backlog",
      content:
        "Review the returning-user path.\n\nCheck keyboard navigation.\n\nPrepare the design review notes.",
    },
    {
      id: "metrics",
      name: "metrics to check",
      folderId: "backlog",
      content:
        "Activation after the welcome screen.\n\nPermission completion rate.\n\nTime to first useful action.",
    },
  ],
};

function parseStoredState(value) {
  if (!value || typeof value !== "object") return defaultState;
  if (!Array.isArray(value.folders) || !Array.isArray(value.notes)) return defaultState;

  const folders = value.folders
    .filter(
      (folder) =>
        folder && typeof folder.id === "string" && typeof folder.name === "string",
    )
    .filter(
      (folder, index, collection) =>
        collection.findIndex((candidate) => candidate.id === folder.id) === index,
    )
    .map((folder) => ({ id: folder.id, name: folder.name }));

  if (folders.length === 0) return defaultState;

  const folderIds = new Set(folders.map((folder) => folder.id));
  const notes = value.notes
    .filter(
      (note) =>
        note &&
        typeof note.id === "string" &&
        typeof note.name === "string" &&
        typeof note.folderId === "string" &&
        folderIds.has(note.folderId) &&
        typeof note.content === "string",
    )
    .filter(
      (note, index, collection) =>
        collection.findIndex((candidate) => candidate.id === note.id) === index,
    )
    .map((note) => ({
      id: note.id,
      name: note.name,
      folderId: note.folderId,
      content: note.content,
    }));

  if (notes.length === 0) return defaultState;

  const noteIds = new Set(notes.map((note) => note.id));
  const loadedNoteIds = Array.isArray(value.loadedNoteIds)
    ? [...new Set(value.loadedNoteIds.filter((id) => typeof id === "string" && noteIds.has(id)))]
    : [];
  const selectedNoteId = loadedNoteIds.includes(value.selectedNoteId)
    ? value.selectedNoteId
    : loadedNoteIds[0] ?? null;

  return {
    title: typeof value.title === "string" ? value.title : defaultState.title,
    purpose:
      typeof value.purpose === "string" ? value.purpose : defaultState.purpose,
    duration:
      Number.isFinite(value.duration) && value.duration > 0
        ? value.duration
        : DEFAULT_DURATION,
    remaining:
      Number.isFinite(value.remaining) && value.remaining >= 0
        ? value.remaining
        : defaultState.remaining,
    timerStatus: ["paused", "running", "completed"].includes(value.timerStatus)
      ? value.timerStatus
      : defaultState.timerStatus,
    timerKind: value.timerKind === "break" ? "break" : "focus",
    endsAt:
      value.timerStatus === "running" && Number.isFinite(value.endsAt)
        ? value.endsAt
        : value.timerStatus === "running"
          ? Date.now() +
            (Number.isFinite(value.remaining) ? value.remaining : defaultState.remaining) *
              1000
          : null,
    selectedNoteId,
    loadedNoteIds,
    folders,
    notes,
  };
}

function loadState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? parseStoredState(JSON.parse(stored)) : defaultState;
  } catch {
    return defaultState;
  }
}

function loadTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  } catch {
    return "light";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getTimerStatusLabel(status, kind) {
  if (status === "completed") {
    return kind === "break" ? "Break complete" : "Session complete";
  }
  if (kind === "break") return status === "running" ? "Break" : "Break paused";
  return status === "running" ? "Focus session" : "Session paused";
}

function SessionTimer({
  duration,
  kind,
  remaining,
  status,
  onContinue,
  onFinish,
  onReset,
  onStartBreak,
  onToggle,
}) {
  if (status === "completed") {
    return (
      <div className="timer-complete" role="status">
        <span>
          <strong>{kind === "break" ? "break complete" : "session complete"}</strong>
          <small>{kind === "break" ? "ready to focus again" : "choose what happens next"}</small>
        </span>
        <div className="timer-complete-actions">
          {kind === "focus" && (
            <button type="button" className="break-button" onClick={onStartBreak}>
              5 min break
            </button>
          )}
          {kind === "focus" && (
            <button type="button" className="finish-button" onClick={onFinish}>
              finish
            </button>
          )}
          <button type="button" className="continue-button" onClick={onContinue}>
            {kind === "break" ? "start focus" : "continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-strip">
      <div className="timer-readout">
        <time className="timer" dateTime={`PT${remaining}S`}>
          {formatTime(remaining)}
        </time>
        <span className="timer-meta">
          {kind === "break" ? "break" : status === "running" ? "focusing" : "paused"}
          {kind === "focus" && (
            <span className="timer-duration-meta">
              {` · ${Math.round(duration / 60)} min`}
            </span>
          )}
        </span>
      </div>
      <div className="timer-controls">
        {status === "paused" && (
          <button
            className="timer-reset-button"
            type="button"
            aria-label="Reset timer"
            onClick={onReset}
          >
            <ArrowCounterClockwise size={19} />
          </button>
        )}
        <button
          className="timer-toggle-button"
          type="button"
          aria-label={status === "running" ? "Pause timer" : "Start timer"}
          onClick={onToggle}
        >
          {status === "running" ? (
            <Pause size={23} weight="fill" />
          ) : (
            <Play size={23} weight="fill" />
          )}
        </button>
      </div>
    </div>
  );
}

export function App() {
  const [appState, setAppState] = useState(loadState);
  const [isPinned, setIsPinned] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(loadTheme);
  const [isSessionFolded, setIsSessionFolded] = useState(false);
  const [isNotesFolded, setIsNotesFolded] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [renamingNoteId, setRenamingNoteId] = useState(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState([]);
  const [noteSaveStatus, setNoteSaveStatus] = useState("saved");
  const [announcement, setAnnouncement] = useState("");
  const [position, setPosition] = useState(null);
  const dragState = useRef(null);
  const menuRef = useRef(null);
  const noteSaveTimerRef = useRef(null);
  const tabRefs = useRef(new Map());

  const selectedNote = useMemo(
    () => appState.notes.find((note) => note.id === appState.selectedNoteId),
    [appState.notes, appState.selectedNoteId],
  );

  const loadedNotes = useMemo(
    () =>
      appState.loadedNoteIds
        .map((id) => appState.notes.find((note) => note.id === id))
        .filter(Boolean),
    [appState.loadedNoteIds, appState.notes],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {
      setNoteSaveStatus("error");
    }
  }, [appState]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (appState.timerStatus !== "running" || !appState.endsAt) return undefined;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((appState.endsAt - Date.now()) / 1000),
      );
      setAppState((current) => {
        if (current.timerStatus !== "running") return current;
        if (remaining === 0) {
          return { ...current, remaining: 0, timerStatus: "completed", endsAt: null };
        }
        return current.remaining === remaining ? current : { ...current, remaining };
      });
      if (remaining === 0) {
        setAnnouncement(
          appState.timerKind === "break" ? "Break complete." : "Focus session complete.",
        );
      }
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [appState.endsAt, appState.timerKind, appState.timerStatus]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.metaKey && event.shiftKey && event.code === "Space") {
        event.preventDefault();
        setIsVisible((visible) => !visible);
      }
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(
    () => () => {
      if (noteSaveTimerRef.current) {
        window.clearTimeout(noteSaveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeMenu);
    return () => window.removeEventListener("pointerdown", closeMenu);
  }, []);

  const updateState = (patch) => {
    setAppState((current) => ({ ...current, ...patch }));
  };

  const startTimer = (duration, kind = "focus") => {
    updateState({
      ...(kind === "focus" ? { duration } : {}),
      remaining: duration,
      timerStatus: "running",
      timerKind: kind,
      endsAt: Date.now() + duration * 1000,
    });
  };

  const toggleTimer = () => {
    setAppState((current) => {
      if (current.timerStatus === "running") {
        const remaining = Math.max(
          0,
          Math.ceil(((current.endsAt ?? Date.now()) - Date.now()) / 1000),
        );
        return {
          ...current,
          remaining,
          timerStatus: remaining === 0 ? "completed" : "paused",
          endsAt: null,
        };
      }

      const remaining = current.remaining || current.duration;
      return {
        ...current,
        remaining,
        timerStatus: "running",
        endsAt: Date.now() + remaining * 1000,
      };
    });
  };

  const resetTimer = () => {
    updateState({
      remaining: appState.duration,
      timerStatus: "paused",
      timerKind: "focus",
      endsAt: null,
    });
    setAnnouncement("Timer reset.");
    setIsMenuOpen(false);
  };

  const finishSession = () => {
    updateState({
      remaining: appState.duration,
      timerStatus: "paused",
      timerKind: "focus",
      endsAt: null,
    });
    setAnnouncement("Session finished. Timer ready for another focus session.");
  };

  const selectDuration = (minutes) => {
    updateState({
      duration: minutes * 60,
      remaining: minutes * 60,
      timerStatus: "paused",
      timerKind: "focus",
      endsAt: null,
    });
    setAnnouncement(`${minutes}-minute timer ready.`);
    setIsMenuOpen(false);
  };

  const openNote = (id) => {
    setAppState((current) => ({
      ...current,
      selectedNoteId: id,
      loadedNoteIds: current.loadedNoteIds.includes(id)
        ? current.loadedNoteIds
        : [...current.loadedNoteIds, id],
    }));
    setIsLibraryOpen(false);
    setIsNotesFolded(false);
    setAnnouncement("Note opened in a tab.");
  };

  const addNote = () => {
    const id = `note-${Date.now()}`;
    const folderId = selectedNote?.folderId ?? appState.folders[0].id;
    const newNote = { id, name: "untitled", folderId, content: "" };
    setAppState((current) => ({
      ...current,
      selectedNoteId: id,
      loadedNoteIds: [...current.loadedNoteIds, id],
      notes: [...current.notes, newNote],
    }));
    setIsLibraryOpen(false);
    setIsNotesFolded(false);
    setRenamingNoteId(id);
    setAnnouncement("New note saved and loaded.");
  };

  const updateSelectedNote = (content) => {
    setNoteSaveStatus("saving");
    if (noteSaveTimerRef.current) {
      window.clearTimeout(noteSaveTimerRef.current);
    }
    noteSaveTimerRef.current = window.setTimeout(() => {
      setNoteSaveStatus("saved");
    }, 450);
    setAppState((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === current.selectedNoteId ? { ...note, content } : note,
      ),
    }));
  };

  const renameNote = (id, name) => {
    const cleanName = name.trim() || "untitled";
    setAppState((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === id ? { ...note, name: cleanName } : note,
      ),
    }));
    setRenamingNoteId(null);
  };

  const unloadNote = (noteId) => {
    const note = appState.notes.find((candidate) => candidate.id === noteId);
    setAppState((current) => {
      const selectedIndex = current.loadedNoteIds.indexOf(noteId);
      const loadedNoteIds = current.loadedNoteIds.filter(
        (id) => id !== noteId,
      );
      const selectedNoteId =
        current.selectedNoteId === noteId
          ? loadedNoteIds[Math.min(selectedIndex, loadedNoteIds.length - 1)] ?? null
          : current.selectedNoteId;
      return { ...current, loadedNoteIds, selectedNoteId };
    });
    setIsMenuOpen(false);
    setIsLibraryOpen(appState.loadedNoteIds.length === 1);
    setAnnouncement(`${note?.name ?? "Note"} closed. It remains in its folder.`);
  };

  const selectTabByIndex = (index) => {
    const note = loadedNotes[index];
    if (!note) return;
    updateState({ selectedNoteId: note.id });
    setIsLibraryOpen(false);
    window.requestAnimationFrame(() => tabRefs.current.get(note.id)?.focus());
  };

  const handleTabKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + loadedNotes.length) % loadedNotes.length;
    } else if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % loadedNotes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = loadedNotes.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    selectTabByIndex(nextIndex);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolderIds((current) =>
      current.includes(folderId)
        ? current.filter((id) => id !== folderId)
        : [...current, folderId],
    );
  };

  const startDrag = (event) => {
    if (isPinned || event.button !== 0) return;
    const windowElement = event.currentTarget.closest(".focus-window");
    const bounds = windowElement.getBoundingClientRect();
    dragState.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continueDrag = (event) => {
    if (!dragState.current) return;
    const width = 550;
    const height = 844;
    setPosition({
      x: Math.max(
        12,
        Math.min(window.innerWidth - width - 12, event.clientX - dragState.current.offsetX),
      ),
      y: Math.max(
        12,
        Math.min(window.innerHeight - height - 12, event.clientY - dragState.current.offsetY),
      ),
    });
  };

  const stopDrag = () => {
    dragState.current = null;
  };

  if (!isVisible) {
    return (
      <main className="desktop" data-theme={theme} aria-live="polite">
        <button className="summon-pill" type="button" onClick={() => setIsVisible(true)}>
          <span className="summon-dot" />
          {formatTime(appState.remaining)}
          <span className="shortcut-hint">⌘⇧Space</span>
        </button>
      </main>
    );
  }

  return (
    <main className="desktop" data-theme={theme}>
      <section
        className={`focus-window ${isSessionFolded ? "session-folded" : ""} ${isNotesFolded ? "notes-folded" : ""}`}
        aria-label="Focus Dock"
        style={position ? { left: position.x, top: position.y, transform: "none" } : undefined}
      >
        <header
          className={`titlebar ${isPinned ? "is-pinned" : "is-draggable"}`}
          onPointerDown={startDrag}
          onPointerMove={continueDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          <div className="traffic-lights" aria-hidden="true">
            <span className="traffic-light close" />
            <span className="traffic-light minimize" />
            <span className="traffic-light maximize" />
          </div>
          <span className="app-name">Focus Dock</span>
          <div className="window-actions">
            <button
              className="icon-button theme-button"
              type="button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              aria-pressed={theme === "dark"}
              onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                setTheme(nextTheme);
                setAnnouncement(`${nextTheme === "dark" ? "Dark" : "Light"} mode enabled.`);
              }}
            >
              {theme === "dark" ? (
                <Sun size={21} weight="regular" />
              ) : (
                <Moon size={21} weight="regular" />
              )}
            </button>
            <button
              className={`icon-button pin-button ${isPinned ? "active" : ""}`}
              type="button"
              aria-label={isPinned ? "Unpin window" : "Pin window"}
              aria-pressed={isPinned}
              onClick={() => {
                setIsPinned((pinned) => !pinned);
                setAnnouncement(isPinned ? "Window can now move." : "Window pinned in place.");
              }}
            >
              <PushPinSimple size={22} weight={isPinned ? "fill" : "regular"} />
            </button>
            <div className="menu-anchor" ref={menuRef}>
              <button
                className="icon-button"
                type="button"
                aria-label="Open session menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((open) => !open)}
              >
                <DotsThree size={26} weight="bold" />
              </button>
              {isMenuOpen && (
                <div className="session-menu" role="menu">
                  <p className="menu-label">timer length</p>
                  {[25, 50].map((minutes) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={minutes}
                      onClick={() => selectDuration(minutes)}
                    >
                      <span>{minutes} minutes</span>
                      {appState.duration === minutes * 60 && <Check size={16} />}
                    </button>
                  ))}
                  <button type="button" role="menuitem" onClick={resetTimer}>
                    <ArrowCounterClockwise size={17} />
                    <span>reset timer</span>
                  </button>
                  {selectedNote && (
                    <>
                      <div className="menu-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setRenamingNoteId(selectedNote.id);
                          setIsMenuOpen(false);
                        }}
                      >
                        <PencilSimple size={17} />
                        <span>rename note</span>
                      </button>
                    </>
                  )}
                  <div className="menu-divider" />
                  <button type="button" role="menuitem" onClick={() => setIsVisible(false)}>
                    <X size={17} />
                    <span>hide window</span>
                    <kbd>⌘⇧Space</kbd>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section
          id="session-panel"
          className={`session-panel ${isSessionFolded ? "is-folded" : ""}`}
          aria-labelledby="session-title"
        >
          {isSessionFolded ? (
            <button
              className="folded-session-button"
              type="button"
              aria-label="Expand session"
              aria-expanded="false"
              aria-controls="session-panel"
              onClick={() => setIsSessionFolded(false)}
            >
              <span className="folded-session-copy">
                <strong id="session-title">{appState.title || "Untitled session"}</strong>
                <span>{formatTime(appState.remaining)}</span>
              </span>
              <CaretDown size={20} weight="bold" />
            </button>
          ) : (
            <>
              <button
                className="panel-fold-button session-fold-button"
                type="button"
                aria-label="Fold session"
                aria-expanded="true"
                aria-controls="session-panel"
                onClick={() => setIsSessionFolded(true)}
              >
                <CaretUp size={20} weight="bold" />
              </button>
              <div className="session-copy">
                <input
                  id="session-title"
                  className="session-title"
                  value={appState.title}
                  aria-label="Session title"
                  onChange={(event) => updateState({ title: event.target.value })}
                />
                <textarea
                  className="session-purpose"
                  value={appState.purpose}
                  aria-label="Session purpose"
                  rows={2}
                  onChange={(event) => updateState({ purpose: event.target.value })}
                />
              </div>
              <SessionTimer
                duration={appState.duration}
                kind={appState.timerKind}
                remaining={appState.remaining}
                status={appState.timerStatus}
                onToggle={toggleTimer}
                onReset={resetTimer}
                onStartBreak={() => startTimer(5 * 60, "break")}
                onContinue={() => startTimer(appState.duration, "focus")}
                onFinish={finishSession}
              />
            </>
          )}
        </section>

        <nav className="tabs" aria-label="Notes">
          <button
            className={`library-button ${isLibraryOpen ? "selected" : ""}`}
            type="button"
            aria-label={isLibraryOpen ? "Close note library" : "Open note library"}
            aria-expanded={isLibraryOpen}
            aria-controls="note-editor"
            onClick={() => {
              setIsLibraryOpen((open) => !open);
              setIsNotesFolded(false);
            }}
          >
            <FolderOpen size={22} weight={isLibraryOpen ? "fill" : "regular"} />
            <span>notes</span>
          </button>
          <div className="tab-list" role="tablist">
            {loadedNotes.length === 0 && (
              <span className="empty-tabs">no notes loaded</span>
            )}
            {loadedNotes.map((note, index) => (
              <div className="tab-shell" key={note.id}>
                {renamingNoteId === note.id ? (
                  <input
                    className="tab-rename-input"
                    defaultValue={note.name}
                    aria-label="Rename note tab"
                    autoFocus
                    onFocus={(event) => event.target.select()}
                    onBlur={(event) => renameNote(note.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") setRenamingNoteId(null);
                    }}
                  />
                ) : (
                  <button
                    ref={(element) => {
                      if (element) tabRefs.current.set(note.id, element);
                      else tabRefs.current.delete(note.id);
                    }}
                    type="button"
                    role="tab"
                    tabIndex={note.id === appState.selectedNoteId ? 0 : -1}
                    aria-selected={!isLibraryOpen && note.id === appState.selectedNoteId}
                    aria-controls="note-editor"
                    className={!isLibraryOpen && note.id === appState.selectedNoteId ? "selected" : ""}
                    onClick={() => {
                      updateState({ selectedNoteId: note.id });
                      setIsLibraryOpen(false);
                    }}
                    onDoubleClick={() => setRenamingNoteId(note.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                  >
                    {note.name}
                  </button>
                )}
                {!isLibraryOpen && note.id === appState.selectedNoteId && renamingNoteId !== note.id && (
                  <button
                    type="button"
                    className="close-tab-button"
                    aria-label={`Close ${note.name} tab`}
                    onClick={() => unloadNote(note.id)}
                  >
                    <X size={13} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="fold-notes-button"
            type="button"
            aria-label={isNotesFolded ? "Expand notes" : "Fold notes"}
            aria-expanded={!isNotesFolded}
            aria-controls="note-editor"
            onClick={() => setIsNotesFolded((folded) => !folded)}
          >
            {isNotesFolded ? (
              <CaretDown size={20} weight="bold" />
            ) : (
              <CaretUp size={20} weight="bold" />
            )}
          </button>
          <button className="add-tab-button" type="button" aria-label="Add note" onClick={addNote}>
            <Plus size={24} />
          </button>
        </nav>

        <section id="note-editor" className="note-editor" aria-hidden={isNotesFolded}>
          {!isNotesFolded && isLibraryOpen && (
            <div className="note-library">
              <header className="library-heading">
                <div>
                  <span className="library-eyebrow">library</span>
                  <h2>all notes</h2>
                </div>
                <span>{appState.notes.length} saved</span>
              </header>
              <div className="folder-list">
                {appState.folders.map((folder) => {
                  const notes = appState.notes.filter(
                    (note) => note.folderId === folder.id,
                  );
                  const isExpanded = expandedFolderIds.includes(folder.id);
                  return (
                    <section className="folder-group" key={folder.id}>
                      <h3>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleFolder(folder.id)}
                        >
                          <FolderSimple size={18} weight="fill" />
                          {folder.name}
                          <span>{notes.length}</span>
                          {isExpanded ? <CaretUp size={15} /> : <CaretDown size={15} />}
                        </button>
                      </h3>
                      {isExpanded && <div className="folder-notes">
                        {notes.map((note) => {
                          const isLoaded = appState.loadedNoteIds.includes(note.id);
                          return (
                            <button
                              type="button"
                              className="library-note"
                              key={note.id}
                              onClick={() => openNote(note.id)}
                            >
                              <NotePencil size={19} />
                              <span>
                                <strong>{note.name}</strong>
                                <small>{note.content.split("\n")[0] || "Empty note"}</small>
                              </span>
                              <em>{isLoaded ? "open" : "open in tab"}</em>
                            </button>
                          );
                        })}
                      </div>}
                    </section>
                  );
                })}
              </div>
            </div>
          )}
          {!isNotesFolded && !isLibraryOpen && selectedNote && (
            <div className="note-writing-area">
              <textarea
                value={selectedNote.content}
                aria-label={`${selectedNote.name} content`}
                onChange={(event) => updateSelectedNote(event.target.value)}
                placeholder="Write a quick note…"
                spellCheck="true"
              />
              <span className={`save-status ${noteSaveStatus}`} role="status">
                {noteSaveStatus === "saving"
                  ? "saving…"
                  : noteSaveStatus === "error"
                    ? "not saved"
                    : "saved"}
              </span>
            </div>
          )}
          {!isNotesFolded && !isLibraryOpen && !selectedNote && (
            <div className="empty-workspace">
              <FolderOpen size={30} />
              <strong>no notes loaded</strong>
              <span>open the library to load a saved note.</span>
              <button type="button" onClick={() => setIsLibraryOpen(true)}>
                open library
              </button>
            </div>
          )}
        </section>

        <footer className="statusbar">
          <span className="status-label">
            <span className={`status-dot ${appState.timerStatus === "running" ? "running" : ""}`} />
            {getTimerStatusLabel(appState.timerStatus, appState.timerKind)}
          </span>
          <button type="button" onClick={() => setIsMenuOpen(true)}>
            {Math.round(appState.duration / 60)} min
          </button>
        </footer>
      </section>
      <p className="sr-only" aria-live="polite">{announcement}</p>
    </main>
  );
}
