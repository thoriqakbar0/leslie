import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityFeed } from "./components/ActivityFeed";
import { CaptureComposer } from "./components/CaptureComposer";
import { Sidebar } from "./components/Sidebar";
import {
  createInitialState,
  formatScaleDate,
  moveScaleDate,
  parseTimeScale,
  removeWorkLogEntry,
  restoreWorkLogEntry,
  timeScaleRange,
  timeScaleHeading,
  timestampOnDate,
} from "./model";
import type {
  EstimateMinutes,
  LeslieState,
  PlannedItem,
  TaskList,
  TimeScale,
  WorkLogEntry,
} from "./model";
import { loadState, saveState } from "./storage";

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

/** Compose Leslie's persistent list and work-log interface. */
function App() {
  const [document, setDocument] = useState<LeslieState | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>("day");
  const [anchorTimestamp, setAnchorTimestamp] = useState(() => Date.now());
  const [removedItem, setRemovedItem] = useState<RemovedItem | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
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
    () => document?.tasks.filter((task) => task.listId === document.activeListId) ?? [],
    [document],
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

  function deleteList(id: string) {
    const current = document;
    if (!current || current.lists.length <= 1) return;
    const list = current.lists.find((candidate) => candidate.id === id);
    if (!list) return;
    const lists = current.lists.filter((candidate) => candidate.id !== id);
    const nextActiveList = lists.find((candidate) => candidate.id === "inbox") ?? lists[0];
    if (!nextActiveList) return;
    const removedTasks = current.tasks.filter((task) => task.listId === id);
    setRemovedItem({ kind: "list", list, tasks: removedTasks });
    setDocument({
      ...current,
      lists,
      activeListId: nextActiveList.id,
      tasks: current.tasks.filter((task) => task.listId !== id),
    });
  }

  function addPlanned(title: string, estimatedMinutes: EstimateMinutes) {
    setDocument((current) =>
      current
        ? {
            ...current,
            tasks: [
              {
                id: createId("task"),
                listId: current.activeListId,
                title,
                estimatedMinutes,
                createdAt: Date.now(),
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
    setAnchorTimestamp((current) =>
      moveScaleDate(new Date(current), timeScale, direction).getTime(),
    );
  }

  const scaleLabel = timeScale;

  return (
    <main className="leslie-app">
      <Sidebar
        activeListId={document.activeListId}
        lists={document.lists}
        onAddList={addList}
        onDeleteList={deleteList}
        onSelectList={selectList}
      />

      <div className="workspace">
        <header className="page-header">
          <label className="visually-hidden" htmlFor="time-scale">
            Time scale
          </label>
          <select
            className="time-scale"
            id="time-scale"
            onChange={(event) => {
              const nextScale = parseTimeScale(event.target.value);
              if (nextScale !== null) setTimeScale(nextScale);
            }}
            value={timeScale}
          >
            <option value="day">{timeScaleHeading("day")}</option>
            <option value="week">{timeScaleHeading("week")}</option>
            <option value="month">{timeScaleHeading("month")}</option>
          </select>
          <div className="date-navigation">
            <button
              aria-label={`Previous ${scaleLabel}`}
              onClick={() => moveDate(-1)}
              type="button"
            >
              <ScaleArrow direction="previous" />
            </button>
            <p aria-live="polite">{formatScaleDate(timeScale, new Date(anchorTimestamp))}</p>
            <button aria-label={`Next ${scaleLabel}`} onClick={() => moveDate(1)} type="button">
              <ScaleArrow direction="next" />
            </button>
          </div>
        </header>

        <div className="stream">
          <CaptureComposer onAddPlanned={addPlanned} onAddWorkLog={addWorkLog} />
          <ActivityFeed
            onComplete={completeTask}
            onEstimateChange={changeEstimate}
            onRemoveTask={removeTask}
            onRemoveWorkLog={removeWorkLog}
            activeListName={
              document.lists.find((list) => list.id === document.activeListId)?.name ?? "This list"
            }
            tasks={visibleTasks}
            timeScale={timeScale}
            workLog={visibleWorkLog}
          />
        </div>
      </div>

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
