import { ESTIMATE_OPTIONS, formatCompactTime, formatDuration, parseEstimate } from "../model";
import type { EstimateMinutes, PlannedItem, TimeScale, WorkLogEntry } from "../model";

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

function PlayIcon({ isPlaying }: { readonly isPlaying: boolean }) {
  return isPlaying ? (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M6.5 5.5v9M13.5 5.5v9" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="m7 5 7 5-7 5Z" />
    </svg>
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
    <section className="activity-feed" aria-label="Activity">
      {tasks.length === 0 ? (
        <p className="activity-empty-note">No planned items in {activeListName}.</p>
      ) : null}

      {tasks.map((task) => {
        const isCurrentTask = playingTaskId === task.id;
        const isTaskPlaying = isCurrentTask && isPlaying;
        return (
          <article
            className={`activity-row planned-row ${isCurrentTask ? "is-current" : ""}`}
            key={task.id}
          >
            <button
              aria-label={`Complete ${task.title}`}
              className="task-check"
              onClick={() => onComplete(task.id)}
              type="button"
            />
            <div className="activity-copy">
              <button
                aria-label={`Open notes for ${task.title}`}
                className="task-notes-trigger"
                data-task-notes-trigger={task.id}
                onClick={() => onOpenNotes(task.id)}
                type="button"
              >
                <span className="activity-kind">
                  Planned <span aria-hidden="true">·</span>{" "}
                  <time dateTime={new Date(task.scheduledAt).toISOString()}>
                    {formatCompactTime(task.scheduledAt)}
                  </time>
                </span>
                <span className="task-title-line">
                  <strong>{task.title}</strong>
                </span>
              </button>
              <button
                aria-label={`${isTaskPlaying ? "Pause" : "Play"} ${task.title}`}
                aria-pressed={isTaskPlaying}
                className="task-play"
                onClick={() => onTogglePlaying(task.id)}
                type="button"
              >
                <PlayIcon isPlaying={isTaskPlaying} />
              </button>
            </div>
            <label className="visually-hidden" htmlFor={`estimate-${task.id}`}>
              Expected time for {task.title}
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
            <button
              aria-label={`Remove ${task.title}`}
              className="remove-item"
              onClick={() => onRemoveTask(task.id)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </article>
        );
      })}

      {workLog.map((entry) => (
        <article className="activity-row log-row" key={entry.id}>
          <time dateTime={new Date(entry.createdAt).toISOString()}>
            {formatCompactTime(entry.createdAt)}
          </time>
          <div className="activity-copy">
            <span className="activity-kind">Did</span>
            <p>{entry.note}</p>
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
      ))}

      {workLog.length === 0 ? (
        <p className="activity-empty-note">No work recorded for this {rangeName}.</p>
      ) : null}
    </section>
  );
}
