import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseEntryLabels, type LabeledEntryText } from "../entry-labels";
import { isTextEntryTarget } from "../keyboard-shortcuts";
import {
  ESTIMATE_OPTIONS,
  formatCompactTime,
  formatDuration,
  parseEstimate,
  timestampAtClockTime,
} from "../model";
import type { EstimateMinutes, PlannedItem, TimeScale, WorkLogEntry } from "../model";
import { taskNavigationIndex } from "../task-navigation";

interface ActivityFeedProps {
  readonly activeListName: string;
  readonly isPlaying: boolean;
  readonly playingTaskId: string | null;
  readonly tasks: readonly PlannedItem[];
  readonly timeScale: TimeScale;
  readonly workLog: readonly WorkLogEntry[];
  readonly onComplete: (id: string) => void;
  readonly onEstimateChange: (id: string, estimate: EstimateMinutes) => void;
  readonly onOpenTaskNotes: (id: string) => void;
  readonly onOpenWorkLogNotes: (id: string) => void;
  readonly onRemoveTask: (id: string) => void;
  readonly onRemoveWorkLog: (id: string) => void;
  readonly onTaskTitleChange: (id: string, title: string) => void;
  readonly onTogglePlaying: (id: string) => void;
  readonly onWorkLogTimeChange: (id: string, createdAt: number) => void;
  readonly onWorkLogTitleChange: (id: string, title: string) => void;
}

type WorkLogSort = "newest" | "oldest";
type EditableEntry = {
  readonly id: string;
  readonly key: string;
  readonly kind: "task" | "log";
  readonly originalTitle: string;
  readonly title: string;
};
type EditableTime = {
  readonly id: string;
  readonly originalValue: string;
  readonly timestamp: number;
  readonly value: string;
};

const workLogDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function PlayIcon({ isPlaying }: { readonly isPlaying: boolean }) {
  return isPlaying ? (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="M6.5 5.5v9M13.5 5.5v9" />
    </svg>
  ) : (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="m7 5 7 5-7 5Z" />
    </svg>
  );
}

function WorkLogSortIcon({ sort }: { readonly sort: WorkLogSort }) {
  return sort === "newest" ? (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M15 12H3m0-7h18M9 19H3" />
    </svg>
  ) : (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      <path d="M3 19h18m-6-7H3m6-7H3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20">
      <path d="m4.5 14.8.8-3.3 7.9-7.9 3.2 3.2-7.9 7.9-3.3.8Z" />
      <path d="m11.9 4.9 3.2 3.2" />
    </svg>
  );
}

function EntryTitle({ entry }: { readonly entry: LabeledEntryText }) {
  if (entry.labels.length === 0) return entry.text || "Untitled";
  return (
    <>
      {entry.text.length === 0 ? "Untitled " : null}
      {entry.parts.map((part, index) => (
        <span className={part.kind === "label" ? "entry-title-label" : undefined} key={index}>
          {part.value}
        </span>
      ))}
    </>
  );
}

/** Render planned items and completed-work entries as one chronological work surface. */
export function ActivityFeed({
  activeListName,
  isPlaying,
  playingTaskId,
  tasks,
  timeScale,
  workLog,
  onComplete,
  onEstimateChange,
  onOpenTaskNotes,
  onOpenWorkLogNotes,
  onRemoveTask,
  onRemoveWorkLog,
  onTaskTitleChange,
  onTogglePlaying,
  onWorkLogTimeChange,
  onWorkLogTitleChange,
}: ActivityFeedProps) {
  const [workLogSort, setWorkLogSort] = useState<WorkLogSort>("newest");
  const [editableEntry, setEditableEntry] = useState<EditableEntry | null>(null);
  const [editableTime, setEditableTime] = useState<EditableTime | null>(null);
  const isFinishingEdit = useRef(false);
  const isFinishingTimeEdit = useRef(false);
  const sortedWorkLog = useMemo(
    () =>
      [...workLog].sort((left, right) =>
        workLogSort === "newest"
          ? right.createdAt - left.createdAt
          : left.createdAt - right.createdAt,
      ),
    [workLog, workLogSort],
  );

  function startEditing(kind: EditableEntry["kind"], id: string, title: string) {
    isFinishingEdit.current = false;
    setEditableEntry({ id, key: `${kind}:${id}`, kind, originalTitle: title, title });
  }

  function finishEditing(save: boolean, restoreFocus: boolean) {
    if (editableEntry === null || isFinishingEdit.current) return;
    isFinishingEdit.current = true;
    const targetKey = editableEntry.key;
    const title = editableEntry.title.trim();
    if (save && title.length > 0 && title !== editableEntry.originalTitle) {
      if (editableEntry.kind === "task") onTaskTitleChange(editableEntry.id, title);
      else onWorkLogTitleChange(editableEntry.id, title);
    }
    setEditableEntry(null);
    if (!restoreFocus) return;
    globalThis.requestAnimationFrame(() => {
      const triggers = globalThis.document.querySelectorAll<HTMLElement>("[data-notes-trigger]");
      for (const trigger of triggers) {
        if (trigger.dataset.notesTrigger !== targetKey) continue;
        trigger.focus();
        break;
      }
    });
  }

  function editOnShortcut(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    kind: EditableEntry["kind"],
    id: string,
    title: string,
  ) {
    if (
      event.key.toLowerCase() !== "e" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    event.preventDefault();
    startEditing(kind, id, title);
  }

  function startTimeEditing(entry: WorkLogEntry) {
    const value = formatCompactTime(entry.createdAt);
    isFinishingTimeEdit.current = false;
    setEditableTime({ id: entry.id, originalValue: value, timestamp: entry.createdAt, value });
  }

  function finishTimeEditing(save: boolean, restoreFocus: boolean) {
    if (editableTime === null || isFinishingTimeEdit.current) return;
    isFinishingTimeEdit.current = true;
    const { id, originalValue, timestamp, value } = editableTime;
    const nextTimestamp = timestampAtClockTime(timestamp, value);
    if (save && value !== originalValue && nextTimestamp !== null) {
      onWorkLogTimeChange(id, nextTimestamp);
    }
    setEditableTime(null);
    if (!restoreFocus) return;
    globalThis.requestAnimationFrame(() => {
      const trigger = globalThis.document.querySelector<HTMLElement>(
        `[data-time-trigger="${CSS.escape(id)}"]`,
      );
      trigger?.focus();
    });
  }

  useEffect(() => {
    function navigateActivity(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key !== "j" && key !== "k") return;

      const target = event.target;
      const isInsideLeslie =
        target === globalThis.document.body ||
        target === globalThis.document.documentElement ||
        (target instanceof Element && target.closest(".leslie-app") !== null);
      if (!isInsideLeslie || isTextEntryTarget(target)) return;
      if (globalThis.document.querySelector(".notes-sidebar, .date-picker") !== null) return;

      const cards = Array.from(
        globalThis.document.querySelectorAll<HTMLElement>("[data-activity-card]"),
      );
      const activeElement = globalThis.document.activeElement;
      const currentIndex = cards.findIndex(
        (card) => activeElement !== null && card.contains(activeElement),
      );
      const nextIndex = taskNavigationIndex(cards.length, currentIndex, key);
      if (nextIndex === null) return;

      const nextCard = cards[nextIndex];
      const nextTrigger = nextCard?.querySelector<HTMLButtonElement>(
        "[data-activity-navigation-target]",
      );
      if (nextCard === undefined || nextTrigger === null || nextTrigger === undefined) return;

      event.preventDefault();
      nextTrigger.focus({ preventScroll: true });
      nextCard.scrollIntoView({ block: "nearest" });
    }

    globalThis.document.addEventListener("keydown", navigateActivity);
    return () => globalThis.document.removeEventListener("keydown", navigateActivity);
  }, []);

  if (tasks.length === 0 && workLog.length === 0) {
    return (
      <section className="activity-feed activity-feed-empty" aria-label="Activity">
        <div className="empty-state">
          <strong>Nothing here yet.</strong>
          <p>Post a task above when you want to add something.</p>
        </div>
      </section>
    );
  }

  const rangeName = timeScale === "day" ? "day" : timeScale === "week" ? "week" : "month";

  return (
    <section aria-keyshortcuts="j k" aria-label="Activity" className="activity-feed">
      <section aria-labelledby="planned-section-title" className="activity-group">
        <header className="activity-group-header">
          <h2 id="planned-section-title">Planned</h2>
          {tasks.length + workLog.length > 0 ? (
            <p id="activity-navigation-hint">
              <kbd>j</kbd>/<kbd>k</kbd> move <span aria-hidden="true">·</span> <kbd>enter</kbd>{" "}
              notes <span aria-hidden="true">·</span> <kbd>e</kbd> edit
            </p>
          ) : null}
        </header>
        <span className="visually-hidden" id="activity-notes-action-hint">
          Opens notes for this activity. Press E to edit its title.
        </span>

        {tasks.length === 0 ? (
          <p className="activity-empty-note">No planned items in {activeListName}.</p>
        ) : (
          tasks.map((task) => {
            const labeledTitle = parseEntryLabels(task.title);
            const visibleTitle = labeledTitle.text || "Untitled";
            const isCurrentTask = playingTaskId === task.id;
            const isTaskPlaying = isCurrentTask && isPlaying;
            const taskState = isCurrentTask
              ? isTaskPlaying
                ? "Working now"
                : "Paused"
              : "Planned";
            const titleId = `task-title-${task.id}`;
            const metadataId = `task-metadata-${task.id}`;
            return (
              <article
                aria-describedby={metadataId}
                aria-labelledby={titleId}
                className={`activity-row planned-row ${
                  isCurrentTask
                    ? isTaskPlaying
                      ? "is-current is-playing"
                      : "is-current is-paused"
                    : ""
                }`}
                data-activity-card={`task:${task.id}`}
                key={task.id}
              >
                <button
                  aria-label={`Complete ${visibleTitle}`}
                  className="task-check"
                  onClick={() => onComplete(task.id)}
                  type="button"
                />
                <div className="task-card-body">
                  <h3 className="task-title-line" id={titleId}>
                    {editableEntry?.key === `task:${task.id}` ? (
                      <input
                        aria-label={`Edit title: ${visibleTitle}`}
                        autoFocus
                        className="activity-title-editor"
                        data-activity-editing-target=""
                        onBlur={() => finishEditing(true, false)}
                        onChange={(event) =>
                          setEditableEntry({ ...editableEntry, title: event.target.value })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") finishEditing(true, true);
                          if (event.key === "Escape") finishEditing(false, true);
                        }}
                        value={editableEntry.title}
                      />
                    ) : (
                      <button
                        aria-describedby={`${metadataId} activity-notes-action-hint`}
                        aria-keyshortcuts="Enter E"
                        className="task-notes-trigger"
                        data-activity-navigation-target=""
                        data-notes-trigger={`task:${task.id}`}
                        onClick={() => onOpenTaskNotes(task.id)}
                        onKeyDown={(event) => editOnShortcut(event, "task", task.id, task.title)}
                        type="button"
                      >
                        <EntryTitle entry={labeledTitle} />
                      </button>
                    )}
                  </h3>
                  <div className="task-card-details">
                    <p className="task-card-metadata" id={metadataId}>
                      <span className="activity-kind">{taskState}</span>
                      <span aria-hidden="true">·</span>{" "}
                      <time dateTime={new Date(task.scheduledAt).toISOString()}>
                        {formatCompactTime(task.scheduledAt)}
                      </time>
                    </p>
                    <div className="task-card-estimate">
                      <label className="task-card-estimate-label" htmlFor={`estimate-${task.id}`}>
                        Expected
                        <span className="visually-hidden"> time for {task.title}</span>
                      </label>
                      <select
                        className="estimate-select"
                        id={`estimate-${task.id}`}
                        onChange={(event) => {
                          const estimate = parseEstimate(event.target.value);
                          if (estimate !== null) onEstimateChange(task.id, estimate);
                        }}
                        value={task.estimatedMinutes}
                      >
                        {ESTIMATE_OPTIONS.map((estimate) => (
                          <option key={estimate} value={estimate}>
                            {formatDuration(estimate)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="task-card-actions">
                  <button
                    aria-describedby={`${metadataId} playback-action-hint`}
                    aria-label={`Playback for ${visibleTitle}`}
                    aria-pressed={isTaskPlaying}
                    className="task-play"
                    onClick={() => onTogglePlaying(task.id)}
                    type="button"
                  >
                    <PlayIcon isPlaying={isTaskPlaying} />
                  </button>
                  <button
                    aria-label={`Remove ${visibleTitle}`}
                    className="remove-item"
                    onClick={() => onRemoveTask(task.id)}
                    type="button"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      <span className="visually-hidden" id="playback-action-hint">
        Press to switch between playing and paused.
      </span>

      <section aria-labelledby="timeline-section-title" className="activity-group timeline-group">
        <header className="activity-group-header did-header">
          <h2 id="timeline-section-title">Timeline</h2>
          {workLog.length > 1 ? (
            <button
              aria-label={`Sort completed work. ${workLogSort === "newest" ? "Newest first" : "Oldest first"}. Switch to ${workLogSort === "newest" ? "oldest" : "newest"} first`}
              className="did-sort"
              onClick={() => setWorkLogSort(workLogSort === "newest" ? "oldest" : "newest")}
              title={workLogSort === "newest" ? "Newest first" : "Oldest first"}
              type="button"
            >
              <WorkLogSortIcon sort={workLogSort} />
            </button>
          ) : null}
        </header>

        {sortedWorkLog.map((entry) => {
          const labeledNote = parseEntryLabels(entry.note);
          const visibleNote = labeledNote.text || "Untitled";
          const entryDate = new Date(entry.createdAt);
          const titleId = `log-title-${entry.id}`;
          const metadataId = `log-metadata-${entry.id}`;
          return (
            <article
              aria-describedby={metadataId}
              aria-labelledby={titleId}
              className={`activity-row log-row${entry.origin === "planned" ? " from-planned" : ""}`}
              data-activity-card={`log:${entry.id}`}
              key={entry.id}
            >
              <div className="log-date" id={metadataId}>
                <span>{workLogDateFormatter.format(entryDate)}</span>
                {editableTime?.id === entry.id ? (
                  <input
                    aria-label={`Edit time for ${visibleNote}`}
                    autoFocus
                    className="log-time-editor"
                    onBlur={() => finishTimeEditing(true, false)}
                    onChange={(event) =>
                      setEditableTime({ ...editableTime, value: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") finishTimeEditing(true, true);
                      if (event.key === "Escape") finishTimeEditing(false, true);
                    }}
                    step="60"
                    type="time"
                    value={editableTime.value}
                  />
                ) : (
                  <button
                    aria-label={`Edit time: ${formatCompactTime(entry.createdAt)}`}
                    className="log-time-trigger"
                    data-time-trigger={entry.id}
                    onClick={() => startTimeEditing(entry)}
                    type="button"
                  >
                    {formatCompactTime(entry.createdAt)}
                  </button>
                )}
              </div>
              <span aria-hidden="true" className="timeline-marker" />
              <div className="activity-copy">
                {entry.origin === "planned" ? (
                  <div className="activity-kind-line">
                    <span className="planned-origin">From planned</span>
                  </div>
                ) : null}
                <div className="log-title-line">
                  {editableEntry?.key === `log:${entry.id}` ? (
                    <input
                      aria-label={`Edit title: ${visibleNote}`}
                      autoFocus
                      className="activity-title-editor"
                      data-activity-editing-target=""
                      id={titleId}
                      onBlur={() => finishEditing(true, false)}
                      onChange={(event) =>
                        setEditableEntry({ ...editableEntry, title: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") finishEditing(true, true);
                        if (event.key === "Escape") finishEditing(false, true);
                      }}
                      value={editableEntry.title}
                    />
                  ) : (
                    <button
                      aria-describedby={`${metadataId} activity-notes-action-hint`}
                      aria-keyshortcuts="Enter E"
                      className="log-notes-trigger"
                      data-activity-navigation-target=""
                      data-notes-trigger={`log:${entry.id}`}
                      id={titleId}
                      onClick={() => onOpenWorkLogNotes(entry.id)}
                      onKeyDown={(event) => editOnShortcut(event, "log", entry.id, entry.note)}
                      type="button"
                    >
                      <EntryTitle entry={labeledNote} />
                    </button>
                  )}
                  {editableEntry?.key !== `log:${entry.id}` ? (
                    <button
                      aria-label={`Edit title: ${visibleNote}`}
                      className="log-title-edit"
                      onClick={() => startEditing("log", entry.id, entry.note)}
                      title="Edit title"
                      type="button"
                    >
                      <EditIcon />
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                aria-label={`Delete work log: ${entry.note}`}
                className="remove-item"
                onClick={() => onRemoveWorkLog(entry.id)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </article>
          );
        })}

        {workLog.length === 0 ? (
          <p className="activity-empty-note">No work recorded for this {rangeName}.</p>
        ) : null}
      </section>
    </section>
  );
}
