import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityFeed } from "./components/ActivityFeed";
import { CaptureComposer } from "./components/CaptureComposer";
import { DatePicker } from "./components/DatePicker";
import { LiveClock } from "./components/LiveClock";
import { NotesSidebar } from "./components/NotesSidebar";
import { PlaybackBar } from "./components/PlaybackBar";
import { Sidebar } from "./components/Sidebar";
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

type RemovedItem =
  | { readonly kind: "task"; readonly task: PlannedItem }
  | { readonly kind: "log"; readonly entry: WorkLogEntry }
  | { readonly kind: "list"; readonly list: TaskList; readonly tasks: readonly PlannedItem[] };

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function ScaleArrow({ direction }: { readonly direction: "next" | "previous" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d={direction === "previous" ? "M12.5 4.5 7 10l5.5 5.5" : "m7.5 4.5 5.5 5.5-5.5 5.5"} />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M15.4 7.2A6 6 0 1 0 16 10M15.4 7.2V3.8M15.4 7.2H12" />
    </svg>
  );
}

/** Compose Leslie's persistent list and work-log interface. */
function App() {
  const [document, setDocument] = useState<LeslieState | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("day");
  const [anchorTimestamp, setAnchorTimestamp] = useState(() => Date.now());
  const [dateMotionDirection, setDateMotionDirection] = useState<DateMotionDirection>("reset");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeNotesTaskId, setActiveNotesTaskId] = useState<string | null>(null);
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

  useEffect(() => {
    function switchEntryMode(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      const isInsideLeslie =
        target === globalThis.document.body ||
        target === globalThis.document.documentElement ||
        (target instanceof Element && target.closest(".leslie-app") !== null);
      if (!isInsideLeslie) return;

      event.preventDefault();
      setIsDatePickerOpen(false);
      setEntryMode((current) => (current === "did" ? "planned" : "did"));
      captureInputRef.current?.focus();
    }

    globalThis.document.addEventListener("keydown", switchEntryMode);
    return () => globalThis.document.removeEventListener("keydown", switchEntryMode);
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
  const activeNotesTask = useMemo(
    () => document?.tasks.find((task) => task.id === activeNotesTaskId) ?? null,
    [activeNotesTaskId, document],
  );
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
    setActiveNotesTaskId(null);
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
    if (removedTasks.some((task) => task.id === activeNotesTaskId)) setActiveNotesTaskId(null);
    setRemovedItem({ kind: "list", list, tasks: removedTasks });
    setDocument({
      ...current,
      lists,
      activeListId: nextActiveList.id,
      tasks: current.tasks.filter((task) => task.listId !== id),
    });
  }

  function addPlanned(title: string, estimatedMinutes: EstimateMinutes, scheduledAt: number) {
    setDocument((current) =>
      current
        ? {
            ...current,
            tasks: [
              {
                id: createId("task"),
                listId: current.activeListId,
                title,
                notes: "",
                estimatedMinutes,
                scheduledAt,
              },
              ...current.tasks,
            ],
          }
        : current,
    );
  }

  function addWorkLog(note: string) {
    const createdAt = timestampOnDate(new Date(anchorTimestamp));
    setDocument((current) =>
      current
        ? {
            ...current,
            workLog: [{ id: createId("log"), note, createdAt }, ...current.workLog],
          }
        : current,
    );
  }

  function completeTask(id: string) {
    const createdAt = timestampOnDate(new Date(anchorTimestamp));
    setDocument((current) => {
      if (!current) return current;
      const task = current.tasks.find((candidate) => candidate.id === id);
      if (!task) return current;
      return {
        ...current,
        tasks: current.tasks.filter((candidate) => candidate.id !== id),
        workLog: [
          {
            id: createId("log"),
            note: `Completed ${task.title}.`,
            createdAt,
          },
          ...current.workLog,
        ],
      };
    });
    if (id === playingTaskId) stopPlaying();
    if (id === activeNotesTaskId) setActiveNotesTaskId(null);
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

  function openTaskNotes(id: string) {
    setIsDatePickerOpen(false);
    setActiveNotesTaskId(id);
  }

  function changeTaskNotes(id: string, notes: string) {
    setDocument((current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === id && task.notes !== notes ? { ...task, notes } : task,
            ),
          }
        : current,
    );
  }

  function closeTaskNotes() {
    const taskId = activeNotesTaskId;
    setActiveNotesTaskId(null);
    if (taskId === null) return;
    globalThis.requestAnimationFrame(() => {
      const triggers = globalThis.document.querySelectorAll<HTMLElement>(
        "[data-task-notes-trigger]",
      );
      for (const trigger of triggers) {
        if (trigger.dataset.taskNotesTrigger !== taskId) continue;
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
    if (id === activeNotesTaskId) setActiveNotesTaskId(null);
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

  function moveDate(direction: -1 | 1) {
    setIsDatePickerOpen(false);
    setDateMotionDirection(direction === -1 ? "previous" : "next");
    setAnchorTimestamp((current) =>
      moveScaleDate(new Date(current), timeScale, direction).getTime(),
    );
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

  const scaleLabel = timeScale;

  return (
    <main className="leslie-app">
      <Sidebar
        activeListId={document.activeListId}
        lists={document.lists}
        onAddList={addList}
        onDeleteList={deleteList}
        onRenameList={renameList}
        onSelectList={selectList}
      />

      <div className="workspace">
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
                <button
                  aria-label="Refresh Leslie"
                  className="renderer-refresh"
                  onClick={() => globalThis.location.reload()}
                  title="Refresh renderer"
                  type="button"
                >
                  <RefreshIcon />
                </button>
              </div>
            </div>
            <div className="date-navigation-wrap" ref={dateNavigationRef}>
              <div className="date-navigation">
                <button
                  aria-label={`Previous ${scaleLabel}`}
                  onClick={() => moveDate(-1)}
                  type="button"
                >
                  <ScaleArrow direction="previous" />
                </button>
                <button
                  aria-controls="date-picker"
                  aria-expanded={isDatePickerOpen}
                  aria-haspopup="dialog"
                  aria-label="Choose date"
                  className="current-date"
                  onClick={() => setIsDatePickerOpen((current) => !current)}
                  ref={dateButtonRef}
                  type="button"
                >
                  <span aria-live="polite">
                    {formatScaleDate(timeScale, new Date(anchorTimestamp))}
                  </span>
                </button>
                <button aria-label={`Next ${scaleLabel}`} onClick={() => moveDate(1)} type="button">
                  <ScaleArrow direction="next" />
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
              onOpenNotes={openTaskNotes}
              onRemoveTask={removeTask}
              onRemoveWorkLog={removeWorkLog}
              onTogglePlaying={togglePlaying}
              playingTaskId={playingTaskId}
              tasks={visibleTasks}
              timeScale={timeScale}
              workLog={visibleWorkLog}
            />
          </div>
        </div>
      </div>

      {activeNotesTask ? (
        <NotesSidebar
          notes={activeNotesTask.notes}
          onClose={closeTaskNotes}
          onNotesChange={(notes) => changeTaskNotes(activeNotesTask.id, notes)}
          taskTitle={activeNotesTask.title}
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
    </main>
  );
}

export default App;
