import { formatDuration } from "../model";
import type { PlannedItem } from "../model";

interface PlaybackBarProps {
  readonly elapsedSeconds: number;
  readonly isPlaying: boolean;
  readonly task: PlannedItem | null;
  readonly onStop: () => void;
  readonly onToggle: () => void;
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function PlaybackIcon({ isPlaying }: { readonly isPlaying: boolean }) {
  return isPlaying ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 6v12M16 6v12" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 6 9 6-9 6Z" />
    </svg>
  );
}

/** Show the active planned item when playback has started. */
export function PlaybackBar({
  elapsedSeconds,
  isPlaying,
  task,
  onStop,
  onToggle,
}: PlaybackBarProps) {
  if (task === null) return null;

  const expectedSeconds = task.estimatedMinutes * 60;

  return (
    <section aria-label={`Now playing ${task.title}`} className="playback-bar is-active">
      <div className="playback-content">
        <button
          aria-label={`${isPlaying ? "Pause" : "Play"} ${task.title}`}
          className="playback-toggle"
          onClick={onToggle}
          type="button"
        >
          <PlaybackIcon isPlaying={isPlaying} />
        </button>
        <div className="playback-copy">
          <span>{isPlaying ? "Now playing" : "Paused"}</span>
          <strong>{task.title}</strong>
        </div>
        <div className="playback-time">
          <time dateTime={`PT${elapsedSeconds}S`}>{formatElapsedTime(elapsedSeconds)}</time>
          <span>of {formatDuration(task.estimatedMinutes)}</span>
        </div>
        <button
          aria-label={`Stop ${task.title}`}
          className="playback-stop"
          onClick={onStop}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
        <progress
          aria-label={`Elapsed time for ${task.title}`}
          className="playback-progress"
          max={expectedSeconds}
          value={Math.min(elapsedSeconds, expectedSeconds)}
        />
      </div>
    </section>
  );
}
