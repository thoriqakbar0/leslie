import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityFeed } from "./components/ActivityFeed";
import { CaptureComposer } from "./components/CaptureComposer";
import { DatePicker } from "./components/DatePicker";
import { LiveClock } from "./components/LiveClock";
import { NotesSidebar } from "./components/NotesSidebar";
import { PlaybackBar } from "./components/PlaybackBar";
import { Sidebar } from "./components/Sidebar";
import { dateShortcutDirection, isTextEntryTarget } from "./keyboard-shortcuts";
import {
  createInitialState,
  formatScaleDate,
  moveScaleDate,
  plannedItemsInRange,
  parseTimeScale,
  removeWorkLogEntry,
  restoreWorkLogEntry,
  timeScaleRange,
  timeScaleHeading,
  timestampOnDate,
} from "./model";
import type {
  ActivityHistoryEntry,
  EntryMode,
  EstimateMinutes,
  LeslieState,
  PlannedItem,
  TaskList,
  TimeScale,
  WorkLogEntry,
} from "./model";
import { loadState, saveState } from "./storage";

type DateMotionDirection = "next" | "previous" | "reset";

type NotesTarget =
  | { readonly kind: "task"; readonly id: string }
  | { readonly kind: "log"; readonly id: string };

type RemovedItem =
  | { readonly kind: "task"; readonly task: PlannedItem }
  | { readonly kind: "log"; readonly entry: WorkLogEntry }
  | { readonly kind: "list"; readonly list: TaskList; readonly tasks: readonly PlannedItem[] };

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Compose Leslie's persistent list and work-log interface. */
function App() {
  const [document, setDocument] = useState<LeslieState | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("day");
  const [anchorTimestamp, setAnchorTimestamp] = useState(() => Date.now());
  const [dateMotionDirection, setDateMotionDirection] = useState<DateMotionDirection>("reset");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeNotesTarget, setActiveNotesTarget] = useState<NotesTarget | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("did");
  const [playingTaskId, setPlayingTaskId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [removedItem, setRemovedItem] = useState<RemovedItem | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const dateNavigationRef = useRef<HTMLDivElement>(null);
  const skipNextSave = useRef(false);
  const saveQueue = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void loadState().then((result) => {
      if (!isCurrent) return;
      skipNextSave.current = true;
      if (result.ok) {
        setDocument(result.value);
        setStorageFailed(false);
      } else {
        setDocument(createInitialState());
        setStorageFailed(true);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = globalThis.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
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
      setDateMotionDirection(direction === -1 ? "previous" : "next");
      setAnchorTimestamp((current) =>
        moveScaleDate(new Date(current), timeScale, direction).getTime(),
      );
    }

    globalThis.document.addEventListener("keydown", navigateDates);
    return () => globalThis.document.removeEventListener("keydown", navigateDates);
  }, [timeScale]);

  useEffect(() => {
    if (document === null) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    let isCurrent = true;
    const stateToSave = document;
    const previousSave = saveQueue.current ?? Promise.resolve();
    saveQueue.current = previousSave.then(async () => {
      const result = await saveState(stateToSave);
      if (isCurrent) setStorageFailed(!result.ok);
    });
    return () => {
      isCurrent = false;
    };
  }, [document]);

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

  if (document === null) {
    return (
      <main className="leslie-loading" aria-label="Loading Leslie">
        <span>Leslie</span>
      </main>
    );
  }

  function selectList(activeListId: string) {
    setActiveNotesTarget(null);
    setDocument((current) => (current ? { ...current, activeListId } : current));
  }

  function addList(name: string) {
    setDocument((current) => {
      if (!current) return current;
      const existing = current.lists.find(
        (list) => list.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0,
      );
      if (existing) return { ...current, activeListId: existing.id };
      const newList = { id: createId("list"), name };
      return { ...current, lists: [...current.lists, newList], activeListId: newList.id };
    });
  }

  function renameList(id: string, name: string) {
    setDocument((current) => {
      if (!current) return current;
      const duplicate = current.lists.some(
        (list) =>
          list.id !== id && list.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0,
      );
      if (duplicate) return current;
      return {
        ...current,
        lists: current.lists.map((list) => (list.id === id ? { ...list, name } : list)),
      };
    });
  }

  function deleteList(id: string) {
    const current = document;
    if (!current || current.lists.length <= 1) return;
    const list = current.lists.find((candidate) => candidate.id === id);
    if (!list) return;
    const lists = current.lists.filter((candidate) => candidate.id !== id);
    const nextActiveList = lists.find((candidate) => candidate.id === "inbox") ?? lists[0];
    if (!nextActiveList) return;
    const removedTasks = current.tasks.filter((task) => task.listId === id);
    if (removedTasks.some((task) => task.id === playingTaskId)) stopPlaying();
    if (
      activeNotesTarget?.kind === "task" &&
      removedTasks.some((task) => task.id === activeNotesTarget.id)
    ) {
      setActiveNotesTarget(null);
    }
    setRemovedItem({ kind: "list", list, tasks: removedTasks });
    setDocument({
      ...current,
      lists,
      activeListId: nextActiveList.id,
      tasks: current.tasks.filter((task) => task.listId !== id),
    });
  }

  function addPlanned(title: string, estimatedMinutes: EstimateMinutes, scheduledAt: number) {
    const taskId = createId("task");
    const historyEntry: ActivityHistoryEntry = {
      id: createId("history"),
      itemId: taskId,
      type: "planned-created",
      title,
      occurredAt: Date.now(),
    };
    setDocument((current) =>
      current
        ? {
            ...current,
            tasks: [
              {
                id: taskId,
                listId: current.activeListId,
                title,
                notes: "",
                estimatedMinutes,
                scheduledAt,
              },
              ...current.tasks,
            ],
            history: [historyEntry, ...current.history],
          }
        : current,
    );
  }

  function addWorkLog(note: string) {
    const createdAt = timestampOnDate(new Date(anchorTimestamp));
    const logId = createId("log");
    const historyEntry: ActivityHistoryEntry = {
      id: createId("history"),
      itemId: logId,
      type: "did-created",
      title: note,
      occurredAt: Date.now(),
    };
    setDocument((current) =>
      current
        ? {
            ...current,
            workLog: [
              { id: logId, note, notes: "", origin: "direct", createdAt },
              ...current.workLog,
            ],
            history: [historyEntry, ...current.history],
          }
        : current,
    );
  }

  function completeTask(id: string) {
    const createdAt = timestampOnDate(new Date(anchorTimestamp));
    const historyId = createId("history");
    const occurredAt = Date.now();
    setDocument((current) => {
      if (!current) return current;
      const task = current.tasks.find((candidate) => candidate.id === id);
      if (!task) return current;
      return {
        ...current,
        tasks: current.tasks.filter((candidate) => candidate.id !== id),
        workLog: [
          {
            id: task.id,
            note: `Completed ${task.title}.`,
            notes: task.notes,
            origin: "planned",
            createdAt,
          },
          ...current.workLog,
        ],
        history: [
          {
            id: historyId,
            itemId: task.id,
            type: "planned-completed",
            title: task.title,
            occurredAt,
          },
          ...current.history,
        ],
      };
    });
    if (id === playingTaskId) stopPlaying();
    if (activeNotesTarget?.kind === "task" && id === activeNotesTarget.id) {
      setActiveNotesTarget(null);
    }
  }

  function changeEstimate(id: string, estimatedMinutes: EstimateMinutes) {
    setDocument((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === id ? { ...task, estimatedMinutes } : task,
            ),
          }
        : current,
    );
  }

  function changeTaskTitle(id: string, title: string) {
    const historyId = createId("history");
    const occurredAt = Date.now();
    setDocument((current) => {
      if (!current) return current;
      const task = current.tasks.find((candidate) => candidate.id === id);
      if (!task || task.title === title) return current;
      return {
        ...current,
        tasks: current.tasks.map((candidate) =>
          candidate.id === id ? { ...candidate, title } : candidate,
        ),
        history: [
          {
            id: historyId,
            itemId: id,
            itemKind: "planned",
            type: "title-changed",
            previousTitle: task.title,
            title,
            occurredAt,
          },
          ...current.history,
        ],
      };
    });
  }

  function changeWorkLogTitle(id: string, title: string) {
    const historyId = createId("history");
    const occurredAt = Date.now();
    setDocument((current) => {
      if (!current) return current;
      const entry = current.workLog.find((candidate) => candidate.id === id);
      if (!entry || entry.note === title) return current;
      return {
        ...current,
        workLog: current.workLog.map((candidate) =>
          candidate.id === id ? { ...candidate, note: title } : candidate,
        ),
        history: [
          {
            id: historyId,
            itemId: id,
            itemKind: "did",
            type: "title-changed",
            previousTitle: entry.note,
            title,
            occurredAt,
          },
          ...current.history,
        ],
      };
    });
  }

  function openNotes(target: NotesTarget) {
    setIsDatePickerOpen(false);
    setActiveNotesTarget(target);
  }

  function changeNotes(target: NotesTarget, notes: string) {
    setDocument((current) =>
      !current
        ? current
        : target.kind === "task"
          ? {
              ...current,
              tasks: current.tasks.map((task) =>
                task.id === target.id && task.notes !== notes ? { ...task, notes } : task,
              ),
            }
          : {
              ...current,
              workLog: current.workLog.map((entry) =>
                entry.id === target.id && entry.notes !== notes ? { ...entry, notes } : entry,
              ),
            },
    );
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
    setDocument({
      ...current,
      tasks: current.tasks.filter((candidate) => candidate.id !== id),
    });
    if (id === playingTaskId) stopPlaying();
    if (activeNotesTarget?.kind === "task" && id === activeNotesTarget.id) {
      setActiveNotesTarget(null);
    }
  }

  function togglePlaying(id: string) {
    if (playingTaskId === id) {
      setIsPlaying((current) => !current);
      return;
    }
    setPlayingTaskId(id);
    setElapsedSeconds(0);
    setIsPlaying(true);
  }

  function stopPlaying() {
    setPlayingTaskId(null);
    setIsPlaying(false);
    setElapsedSeconds(0);
  }

  function removeWorkLog(id: string) {
    const current = document;
    if (!current) return;
    const result = removeWorkLogEntry(current.workLog, id);
    if (!result) return;
    setRemovedItem({ kind: "log", entry: result.removed });
    setDocument({
      ...current,
      workLog: result.workLog,
    });
    if (activeNotesTarget?.kind === "log" && id === activeNotesTarget.id) {
      setActiveNotesTarget(null);
    }
  }

  function undoRemove() {
    if (!removedItem) return;
    setDocument((current) => {
      if (!current) return current;
      switch (removedItem.kind) {
        case "task":
          return { ...current, tasks: [removedItem.task, ...current.tasks] };
        case "log":
          return {
            ...current,
            workLog: restoreWorkLogEntry(current.workLog, removedItem.entry),
          };
        case "list":
          return {
            ...current,
            lists: [...current.lists, removedItem.list],
            activeListId: removedItem.list.id,
            tasks: [...removedItem.tasks, ...current.tasks],
          };
      }
    });
    setRemovedItem(null);
  }

  function selectDate(date: Date) {
    const current = new Date(anchorTimestamp);
    const selectedTimestamp = timestampOnDate(date, current);
    setDateMotionDirection(selectedTimestamp < current.getTime() ? "previous" : "next");
    setAnchorTimestamp(selectedTimestamp);
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
                    setDateMotionDirection("reset");
                    setTimeScale(nextScale);
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
                "This list"
              }
              isPlaying={isPlaying}
              onComplete={completeTask}
              onEstimateChange={changeEstimate}
              onOpenTaskNotes={(id) => openNotes({ kind: "task", id })}
              onOpenWorkLogNotes={(id) => openNotes({ kind: "log", id })}
              onRemoveTask={removeTask}
              onRemoveWorkLog={removeWorkLog}
              onTaskTitleChange={changeTaskTitle}
              onTogglePlaying={togglePlaying}
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
            ? "List removed"
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
