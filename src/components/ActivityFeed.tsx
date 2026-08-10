import { ESTIMATE_OPTIONS, formatDuration, formatEntryTime, parseEstimate } from "../model";
import type { EstimateMinutes, PlannedItem, TimeScale, WorkLogEntry } from "../model";

interface ActivityFeedProps {
  readonly activeListName: string;
  readonly tasks: readonly PlannedItem[];
  readonly timeScale: TimeScale;
  readonly workLog: readonly WorkLogEntry[];
  readonly onComplete: (id: string) => void;
  readonly onEstimateChange: (id: string, estimate: EstimateMinutes) => void;
  readonly onRemoveTask: (id: string) => void;
  readonly onRemoveWorkLog: (id: string) => void;
}

/** Render planned items and completed-work entries as one chronological work surface. */
export function ActivityFeed({
  activeListName,
  tasks,
  timeScale,
  workLog,
  onComplete,
  onEstimateChange,
  onRemoveTask,
  onRemoveWorkLog,
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

      {tasks.map((task) => (
        <article className="activity-row planned-row" key={task.id}>
          <button
            aria-label={`Complete ${task.title}`}
            className="task-check"
            onClick={() => onComplete(task.id)}
            type="button"
          />
          <div className="activity-copy">
            <span className="activity-kind">Planned</span>
            <strong>{task.title}</strong>
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
      ))}

      {workLog.map((entry) => (
        <article className="activity-row log-row" key={entry.id}>
          <time dateTime={new Date(entry.createdAt).toISOString()}>
            {formatEntryTime(entry.createdAt)}
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
