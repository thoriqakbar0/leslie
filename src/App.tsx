import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ActivityFeed } from "./components/ActivityFeed";
import { CaptureComposer } from "./components/CaptureComposer";
import { DatePicker } from "./components/DatePicker";
import { LiveClock } from "./components/LiveClock";
import { NotesSidebar } from "./components/NotesSidebar";
import { PlaybackBar } from "./components/PlaybackBar";
import { Sidebar } from "./components/Sidebar";
import { dateShortcutDirection, isTextEntryTarget } from "./keyboard-shortcuts";
import {
  formatScaleDate,
  plannedItemsInRange,
  parseTimeScale,
  timeScaleRange,
  timeScaleHeading,
  timestampOnDate,
} from "./model";
import type { EntryMode, EstimateMinutes } from "./model";
import { useDocumentSession } from "./use-document-session";
import { playbackReducer, type Playback } from "./playback";
import { dateNavigationReducer, type DateNavigation } from "./date-navigation";
import type { NotesTarget, RemovedItem } from "./document-transitions";

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Compose Leslie's persistent folder and work-log interface. */
function App() {
  const { document, sendDocument, retryLoad, loadFailed, storageFailed } = useDocumentSession();

  const [{ timeScale, anchorTimestamp, motion: dateMotionDirection }, navigateDate] = useReducer(
    dateNavigationReducer,
    { timeScale: "day", anchorTimestamp: Date.now(), motion: "reset" } satisfies DateNavigation,
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeNotesTarget, setActiveNotesTarget] = useState<NotesTarget | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("planned");
  const [playback, dispatchPlayback] = useReducer(playbackReducer, {
    kind: "stopped",
  } satisfies Playback);

  const playingTaskId = playback.kind === "stopped" ? null : playback.taskId;
  const isPlaying = playback.kind === "running";
  const elapsedSeconds = playback.kind === "stopped" ? 0 : playback.elapsedSeconds;

  const [removedItem, setRemovedItem] = useState<RemovedItem | null>(null);

  const captureInputRef = useRef<HTMLInputElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const dateNavigationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = globalThis.setInterval(() => {
      dispatchPlayback({ kind: "tick" });
    }, 1_000);
    return () => globalThis.clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (removedItem === null) return;
    const timeout = globalThis.setTimeout(() => setRemovedItem(null), 5_000);
    return () => globalThis.clearTimeout(timeout);
  }, [removedItem]);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !dateNavigationRef.current?.contains(target)) {
        setIsDatePickerOpen(false);
      }
    }
    globalThis.document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => globalThis.document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isDatePickerOpen]);

  useEffect(() => {
    function navigateDates(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isTextEntryTarget(event.target)
      ) {
        return;
      }
      const direction = dateShortcutDirection(event.key);
      if (direction === null) return;
      if (globalThis.document.querySelector(".notes-sidebar, .date-picker") !== null) return;

      event.preventDefault();
      navigateDate({ kind: "move", direction });
    }

    globalThis.document.addEventListener("keydown", navigateDates);
    return () => globalThis.document.removeEventListener("keydown", navigateDates);
  }, []);

  const visibleTasks = useMemo(
    () =>
      document === null
        ? []
        : plannedItemsInRange(
            document.tasks,
            document.activeListId,
            timeScale,
            new Date(anchorTimestamp),
          ),
    [anchorTimestamp, document, timeScale],
  );
  const playingTask = useMemo(
    () => document?.tasks.find((task) => task.id === playingTaskId) ?? null,
    [document, playingTaskId],
  );
  const activeNotesEntry = useMemo(() => {
    if (!document || !activeNotesTarget) return null;
    if (activeNotesTarget.kind === "task") {
      const task = document.tasks.find((candidate) => candidate.id === activeNotesTarget.id);
      return task
        ? {
            key: `task:${task.id}`,
            title: task.title,
            notes: task.notes,
            history: document.history.filter((entry) => entry.itemId === task.id),
            target: activeNotesTarget,
          }
        : null;
    }
    const entry = document.workLog.find((candidate) => candidate.id === activeNotesTarget.id);
    return entry
      ? {
          key: `log:${entry.id}`,
          title: entry.note,
          notes: entry.notes,
          history: document.history.filter((historyEntry) => historyEntry.itemId === entry.id),
          target: activeNotesTarget,
        }
      : null;
  }, [activeNotesTarget, document]);
  const visibleWorkLog = useMemo(() => {
    if (!document) return [];
    const [start, end] = timeScaleRange(timeScale, new Date(anchorTimestamp));
    return document.workLog.filter((entry) => entry.createdAt >= start && entry.createdAt < end);
  }, [anchorTimestamp, document, timeScale]);

  if (loadFailed) {
    return (
      <main className="leslie-loading" aria-labelledby="load-failure-title">
        <div className="load-failure" role="alert">
          <h1 id="load-failure-title">Your data could not be loaded.</h1>
          <p>Leslie has not replaced your saved data. Try loading it again.</p>
          <button onClick={retryLoad} type="button">
            Retry loading
          </button>
        </div>
      </main>
    );
  }

  if (document === null) {
    return (
      <main className="leslie-loading" aria-label="Loading Leslie">
        <span>Leslie</span>
      </main>
    );
  }

  function selectList(id: string) {
    setActiveNotesTarget(null);
    sendDocument({ kind: "list-selected", id });
  }

  function addList(name: string) {
    sendDocument({ kind: "list-added", id: createId("list"), name });
  }

  function renameList(id: string, name: string) {
    sendDocument({ kind: "list-renamed", id, name });
  }

  function deleteList(id: string) {
    const current = document;
    if (!current || current.lists.length <= 1) return;
    const list = current.lists.find((candidate) => candidate.id === id);
    if (!list) return;
    const removedTasks = current.tasks.filter((task) => task.listId === id);
    const removedWorkLog = current.workLog.filter((entry) => entry.listId === id);
    if (removedTasks.some((task) => task.id === playingTaskId)) stopPlaying();
    if (
      activeNotesTarget?.kind === "task" &&
      removedTasks.some((task) => task.id === activeNotesTarget.id)
    ) {
      setActiveNotesTarget(null);
    }
    setRemovedItem({ kind: "list", list, tasks: removedTasks, workLog: removedWorkLog });
    sendDocument({ kind: "list-removed", id });
  }

  function addPlanned(title: string, estimatedMinutes: EstimateMinutes, scheduledAt: number) {
    sendDocument({
      kind: "task-added",
      id: createId("task"),
      title,
      estimatedMinutes,
      scheduledAt,
      historyId: createId("history"),
      occurredAt: Date.now(),
    });
  }

  function addWorkLog(note: string) {
    sendDocument({
      kind: "log-added",
      id: createId("log"),
      note,
      createdAt: timestampOnDate(new Date(anchorTimestamp)),
      historyId: createId("history"),
      occurredAt: Date.now(),
    });
  }

  function completeTask(id: string) {
    sendDocument({
      kind: "task-completed",
      id,
      createdAt: timestampOnDate(new Date(anchorTimestamp)),
      historyId: createId("history"),
      occurredAt: Date.now(),
    });
    if (id === playingTaskId) stopPlaying();
    if (activeNotesTarget?.kind === "task" && id === activeNotesTarget.id) {
      setActiveNotesTarget(null);
    }
  }

  function changeEstimate(id: string, estimatedMinutes: EstimateMinutes) {
    sendDocument({ kind: "estimate-changed", id, estimatedMinutes });
  }

  function changeTaskTitle(id: string, title: string) {
    sendDocument({
      kind: "title-changed",
      target: { kind: "task", id },
      title,
      historyId: createId("history"),
      occurredAt: Date.now(),
    });
  }

  function changeWorkLogTitle(id: string, title: string) {
    sendDocument({
      kind: "title-changed",
      target: { kind: "log", id },
      title,
      historyId: createId("history"),
      occurredAt: Date.now(),
    });
  }

  function changeWorkLogTime(id: string, createdAt: number) {
    sendDocument({ kind: "log-time-changed", id, createdAt });
  }

  function moveTask(id: string, listId: string) {
    sendDocument({ kind: "task-moved", id, listId });
  }

  function openNotes(target: NotesTarget) {
    setIsDatePickerOpen(false);
    setActiveNotesTarget(target);
  }

  function changeNotes(target: NotesTarget, notes: string) {
    sendDocument({ kind: "notes-changed", target, notes });
  }

  function closeNotes() {
    const targetKey = activeNotesEntry?.key ?? null;
    setActiveNotesTarget(null);
    if (targetKey === null) return;
    globalThis.requestAnimationFrame(() => {
      const triggers = globalThis.document.querySelectorAll<HTMLElement>("[data-notes-trigger]");
      for (const trigger of triggers) {
        if (trigger.dataset.notesTrigger !== targetKey) continue;
        trigger.focus();
        break;
      }
    });
  }

  function removeTask(id: string) {
    const current = document;
    if (!current) return;
    const task = current.tasks.find((candidate) => candidate.id === id);
    if (!task) return;
    setRemovedItem({ kind: "task", task });
    sendDocument({ kind: "task-removed", id });
    if (id === playingTaskId) stopPlaying();
    if (activeNotesTarget?.kind === "task" && id === activeNotesTarget.id) {
      setActiveNotesTarget(null);
    }
  }

  function togglePlaying(id: string) {
    dispatchPlayback({ kind: "toggle", taskId: id });
  }

  function stopPlaying() {
    dispatchPlayback({ kind: "stop" });
  }

  function removeWorkLog(id: string) {
    const current = document;
    if (!current) return;
    const entry = current.workLog.find((entry) => entry.id === id);
    if (!entry) return;
    setRemovedItem({ kind: "log", entry });
    sendDocument({ kind: "log-removed", id });
    if (activeNotesTarget?.kind === "log" && id === activeNotesTarget.id) {
      setActiveNotesTarget(null);
    }
  }

  function undoRemove() {
    if (!removedItem) return;
    sendDocument({ kind: "removal-undone", removed: removedItem });
    setRemovedItem(null);
  }

  function selectDate(date: Date) {
    navigateDate({ kind: "select", date });
    setIsDatePickerOpen(false);
    globalThis.requestAnimationFrame(() => dateButtonRef.current?.focus());
  }

  function closeDatePicker() {
    setIsDatePickerOpen(false);
    globalThis.requestAnimationFrame(() => dateButtonRef.current?.focus());
  }

  return (
    <div className="leslie-app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar
        activeListId={document.activeListId}
        lists={document.lists}
        onAddList={addList}
        onDeleteList={deleteList}
        onRenameList={renameList}
        onSelectList={selectList}
      />

      <main
        aria-labelledby="workspace-heading"
        className="workspace"
        id="main-content"
        tabIndex={-1}
      >
        <PlaybackBar
          elapsedSeconds={elapsedSeconds}
          isPlaying={isPlaying}
          onStop={stopPlaying}
          onToggle={() => {
            if (playingTaskId !== null) togglePlaying(playingTaskId);
          }}
          task={playingTask}
        />
        <div className="workspace-content">
          <header className="page-header">
            <h1 className="visually-hidden" id="workspace-heading">
              {timeScaleHeading(timeScale, new Date(anchorTimestamp))} activity
            </h1>
            <label className="visually-hidden" htmlFor="time-scale">
              Time scale
            </label>
            <div className="time-heading">
              <div
                className={`date-title from-${dateMotionDirection}`}
                key={`${timeScale}-${anchorTimestamp}`}
              >
                <select
                  className="time-scale"
                  id="time-scale"
                  onChange={(event) => {
                    const nextScale = parseTimeScale(event.target.value);
                    if (nextScale === null) return;
                    navigateDate({ kind: "scale", scale: nextScale });
                  }}
                  value={timeScale}
                >
                  <option value="day">{timeScaleHeading("day", new Date(anchorTimestamp))}</option>
                  <option value="week">{timeScaleHeading("week")}</option>
                  <option value="month">{timeScaleHeading("month")}</option>
                </select>
              </div>
              <div className="time-support">
                <LiveClock />
              </div>
            </div>
            <div className="date-navigation-wrap" ref={dateNavigationRef}>
              <div className="date-navigation">
                <button
                  aria-controls="date-picker"
                  aria-expanded={isDatePickerOpen}
                  aria-haspopup="dialog"
                  aria-keyshortcuts="H L"
                  aria-label="Choose date"
                  className="current-date"
                  onClick={() => setIsDatePickerOpen((current) => !current)}
                  ref={dateButtonRef}
                  title="Choose date. H and L move through dates."
                  type="button"
                >
                  <span aria-live="polite">
                    {formatScaleDate(timeScale, new Date(anchorTimestamp))}
                  </span>
                </button>
              </div>
              {isDatePickerOpen ? (
                <DatePicker
                  onClose={closeDatePicker}
                  onSelect={selectDate}
                  selectedDate={new Date(anchorTimestamp)}
                />
              ) : null}
            </div>
          </header>

          <div className="stream">
            <CaptureComposer
              captureInputRef={captureInputRef}
              mode={entryMode}
              onAddPlanned={addPlanned}
              onAddWorkLog={addWorkLog}
              onModeChange={setEntryMode}
              planningLocales={globalThis.navigator.languages}
              planningReference={new Date(anchorTimestamp)}
            />
            <ActivityFeed
              activeListName={
                document.lists.find((list) => list.id === document.activeListId)?.name ??
                "This folder"
              }
              isPlaying={isPlaying}
              lists={document.lists}
              onComplete={completeTask}
              onEstimateChange={changeEstimate}
              onMoveTask={moveTask}
              onOpenTaskNotes={(id) => openNotes({ kind: "task", id })}
              onOpenWorkLogNotes={(id) => openNotes({ kind: "log", id })}
              onRemoveTask={removeTask}
              onRemoveWorkLog={removeWorkLog}
              onTaskTitleChange={changeTaskTitle}
              onTogglePlaying={togglePlaying}
              onWorkLogTimeChange={changeWorkLogTime}
              onWorkLogTitleChange={changeWorkLogTitle}
              playingTaskId={playingTaskId}
              tasks={visibleTasks}
              timeScale={timeScale}
              workLog={visibleWorkLog}
            />
          </div>
        </div>
      </main>

      {activeNotesEntry ? (
        <NotesSidebar
          entryTitle={activeNotesEntry.title}
          history={activeNotesEntry.history}
          key={activeNotesEntry.key}
          notes={activeNotesEntry.notes}
          onClose={closeNotes}
          onNotesChange={(notes) => changeNotes(activeNotesEntry.target, notes)}
        />
      ) : null}

      {removedItem ? (
        <div className="toast" role="status">
          {removedItem.kind === "list"
            ? "Folder removed"
            : removedItem.kind === "log"
              ? "Work log removed"
              : "Planned item removed"}
          <button onClick={undoRemove} type="button">
            Undo
          </button>
        </div>
      ) : null}
      {storageFailed ? (
        <p className="storage-warning" role="status">
          Changes cannot be saved on this device.
        </p>
      ) : null}
    </div>
  );
}

export default App;
