import { useEffect, useMemo, useState } from "react";
import { parseEntryLabels } from "../entry-labels";
import { ESTIMATE_OPTIONS, formatCompactTime, formatDuration, parseEstimate } from "../model";
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
  readonly onOpenNotes: (id: string) => void;
  readonly onRemoveTask: (id: string) => void;
  readonly onRemoveWorkLog: (id: string) => void;
  readonly onTogglePlaying: (id: string) => void;
}

type WorkLogSort = "newest" | "oldest";

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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select") !== null) return true;
  const editable = target.closest<HTMLElement>("[contenteditable]");
  return editable !== null && editable.contentEditable !== "false";
}

function EntryLabels({ labels }: { readonly labels: readonly string[] }) {
  if (labels.length === 0) return null;
  return (
    <ul aria-label="Labels" className="entry-labels">
      {labels.map((label) => (
        <li key={label}>{label}</li>
      ))}
    </ul>
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
  onOpenNotes,
  onRemoveTask,
  onRemoveWorkLog,
  onTogglePlaying,
}: ActivityFeedProps) {
  const [workLogSort, setWorkLogSort] = useState<WorkLogSort>("newest");
  const sortedWorkLog = useMemo(
    () =>
      [...workLog].sort((left, right) =>
        workLogSort === "newest"
          ? right.createdAt - left.createdAt
          : left.createdAt - right.createdAt,
      ),
    [workLog, workLogSort],
  );

  useEffect(() => {
    function navigatePlannedTasks(event: KeyboardEvent) {
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
      if (!isInsideLeslie || isTypingTarget(target)) return;
      if (globalThis.document.querySelector(".notes-sidebar, .date-picker") !== null) return;

      const cards = Array.from(
        globalThis.document.querySelectorAll<HTMLElement>("[data-task-card]"),
      );
      const activeElement = globalThis.document.activeElement;
      const currentIndex = cards.findIndex(
        (card) => activeElement !== null && card.contains(activeElement),
      );
      const nextIndex = taskNavigationIndex(cards.length, currentIndex, key);
      if (nextIndex === null) return;

      const nextCard = cards[nextIndex];
      const nextTrigger = nextCard?.querySelector<HTMLButtonElement>(
        "[data-task-navigation-target]",
      );
      if (nextCard === undefined || nextTrigger === null || nextTrigger === undefined) return;

      event.preventDefault();
      nextTrigger.focus({ preventScroll: true });
      nextCard.scrollIntoView({ block: "nearest" });
    }

    globalThis.document.addEventListener("keydown", navigatePlannedTasks);
    return () => globalThis.document.removeEventListener("keydown", navigatePlannedTasks);
  }, []);

  if (tasks.length === 0 && workLog.length === 0) {
    return (
      <section className="activity-feed activity-feed-empty" aria-label="Activity">
        <div className="empty-state">
          <strong>Nothing here yet.</strong>
          <p>Use Did or Planned above when you want to add something.</p>
        </div>
      </section>
    );
  }

  const rangeName = timeScale === "day" ? "day" : timeScale === "week" ? "week" : "month";

  return (
    <section
      aria-keyshortcuts={tasks.length > 0 ? "j k" : undefined}
      aria-label="Activity"
      className="activity-feed"
    >
      <section aria-labelledby="planned-section-title" className="activity-group">
        <header className="activity-group-header">
          <h2 id="planned-section-title">Planned</h2>
          {tasks.length > 0 ? (
            <p id="task-navigation-hint">
              <kbd>j</kbd>/<kbd>k</kbd> move <span aria-hidden="true">·</span> <kbd>enter</kbd>{" "}
              opens notes
            </p>
          ) : null}
        </header>
        {tasks.length > 0 ? (
          <span className="visually-hidden" id="task-notes-action-hint">
            Opens task notes.
          </span>
        ) : null}

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
                data-task-card={task.id}
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
                    <button
                      aria-describedby={`${metadataId} task-notes-action-hint`}
                      className="task-notes-trigger"
                      data-task-navigation-target=""
                      data-task-notes-trigger={task.id}
                      onClick={() => onOpenNotes(task.id)}
                      type="button"
                    >
                      {visibleTitle}
                    </button>
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
                    <EntryLabels labels={labeledTitle.labels} />
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

      <section aria-labelledby="did-section-title" className="activity-group">
        <header className="activity-group-header did-header">
          <h2 id="did-section-title">Did</h2>
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
          const entryDate = new Date(entry.createdAt);
          return (
            <article className="activity-row log-row" key={entry.id}>
              <time className="log-date" dateTime={entryDate.toISOString()}>
                <span>{workLogDateFormatter.format(entryDate)}</span>
                <strong>{formatCompactTime(entry.createdAt)}</strong>
              </time>
              <div className="activity-copy">
                <span className="activity-kind">Did</span>
                <p>{labeledNote.text || "Untitled"}</p>
                <EntryLabels labels={labeledNote.labels} />
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
