import { useMemo, useState } from "react";
import "./prototype.css";

const initialLists = ["Inbox", "Work", "Personal", "Someday"];
const estimates = [15, 30, 60, 120, 240, 480];

const initialTasks = [
  { id: 1, list: "Inbox", title: "Send the invoice", estimatedMinutes: 30 },
  { id: 2, list: "Inbox", title: "Reply to Alex", estimatedMinutes: 15 },
  { id: 3, list: "Inbox", title: "Book dentist appointment", estimatedMinutes: 30 },
  { id: 4, list: "Work", title: "Prepare meeting notes", estimatedMinutes: 60 },
  { id: 5, list: "Personal", title: "Water the plants", estimatedMinutes: 15 },
  { id: 6, list: "Someday", title: "Sort travel receipts", estimatedMinutes: 120 },
];

const initialLog = [
  { id: 1, time: "10:42", note: "Reviewed the invoice details." },
  { id: 2, time: "10:25", note: "Opened the invoice template." },
  { id: 3, time: "09:58", note: "Found the last invoice." },
];

function parseEstimatedMinutes(value) {
  const minutes = Number(value);
  return estimates.includes(minutes) ? minutes : null;
}

function parseTimeScale(value) {
  return ["day", "week", "month"].includes(value) ? value : null;
}

function parsePlannedInput(value, fallbackMinutes) {
  const duration = value.match(/\s+(?:(?:for|in|about)\s+)?(15|30|60|1|2|4|8)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\s*$/i);
  if (!duration) return { title: value.trim(), estimatedMinutes: fallbackMinutes };

  const amount = Number(duration[1]);
  const unit = duration[2].toLowerCase();
  const minutes = unit.startsWith("h") ? amount * 60 : amount;
  const estimatedMinutes = parseEstimatedMinutes(String(minutes));
  if (estimatedMinutes === null) return { title: value.trim(), estimatedMinutes: fallbackMinutes };

  const title = value.slice(0, duration.index).trim();
  return { title: title || value.trim(), estimatedMinutes };
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  return `${minutes / 60} hr`;
}

function timeScaleDate(timeScale) {
  if (timeScale === "day") return "Monday, August 10";
  if (timeScale === "week") return "August 10–16";
  return "August 2026";
}

function currentTime() {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function Sidebar({ activeList, lists, onAddList, onSelect }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newList, setNewList] = useState("");

  function submitNewList(event) {
    event.preventDefault();
    const name = newList.trim();
    if (!name) return;
    onAddList(name);
    setNewList("");
    setIsAdding(false);
  }

  return (
    <aside className="leslie-sidebar">
      <div className="leslie-wordmark">Leslie</div>
      <nav aria-label="Lists">
        {lists.map((list) => (
          <button className={activeList === list ? "active" : ""} key={list} onClick={() => onSelect(list)}>
            {list}
          </button>
        ))}
        {isAdding ? (
          <form className="leslie-new-list" onSubmit={submitNewList}>
            <label className="leslie-visually-hidden" htmlFor="leslie-new-list-input">New list name</label>
            <input
              autoFocus
              id="leslie-new-list-input"
              onBlur={() => {
                if (!newList.trim()) setIsAdding(false);
              }}
              onChange={(event) => setNewList(event.target.value)}
              placeholder="List name"
              value={newList}
            />
            <button aria-label="Create list" className="leslie-new-list-submit" type="submit">+</button>
          </form>
        ) : (
          <button aria-label="Add list" className="leslie-add-list" onClick={() => setIsAdding(true)}>+</button>
        )}
      </nav>
    </aside>
  );
}

function CaptureComposer({ onAddLog, onAddTask }) {
  const [mode, setMode] = useState("did");
  const [text, setText] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);

  function submit(event) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;
    if (mode === "did") onAddLog(cleanText);
    else {
      const planned = parsePlannedInput(cleanText, estimatedMinutes);
      onAddTask(planned.title, planned.estimatedMinutes);
    }
    setText("");
  }

  function switchWithTab(event) {
    if (event.key !== "Tab" || event.shiftKey) return;
    event.preventDefault();
    setMode((current) => (current === "did" ? "planned" : "did"));
  }

  return (
    <section className="leslie-capture-section" aria-label="Quick capture">
      <form className={`leslie-capture-box ${mode}`} onSubmit={submit}>
        <div className="leslie-capture-mode" aria-label="Entry type">
          <button className={mode === "did" ? "active" : ""} onClick={() => setMode("did")} type="button">Did</button>
          <button className={mode === "planned" ? "active" : ""} onClick={() => setMode("planned")} type="button">Planned</button>
        </div>
        <label className="leslie-visually-hidden" htmlFor="leslie-capture-input">
          {mode === "did" ? "What did you do?" : "What do you plan to do?"}
        </label>
        <input
          autoComplete="off"
          autoFocus
          id="leslie-capture-input"
          onChange={(event) => {
            const nextText = event.target.value;
            setText(nextText);
            if (mode === "planned") {
              setEstimatedMinutes(parsePlannedInput(nextText, estimatedMinutes).estimatedMinutes);
            }
          }}
          onKeyDown={switchWithTab}
          placeholder={mode === "did" ? "What did you do?" : "Try “send invoice in 30 min”"}
          value={text}
        />
        {mode === "planned" ? (
          <>
            <label className="leslie-visually-hidden" htmlFor="leslie-capture-estimate">Expected time</label>
            <select
              id="leslie-capture-estimate"
              onChange={(event) => {
                const estimate = parseEstimatedMinutes(event.target.value);
                if (estimate !== null) setEstimatedMinutes(estimate);
              }}
              value={estimatedMinutes}
            >
              {estimates.map((estimate) => <option key={estimate} value={estimate}>{formatDuration(estimate)}</option>)}
            </select>
          </>
        ) : null}
        <button className="leslie-capture-submit" type="submit">Add</button>
      </form>
      <p className="leslie-capture-hint"><kbd>tab</kbd> switches modes · planned entries understand 30 min, 1 hr, and similar times · <kbd>enter</kbd> adds</p>
    </section>
  );
}

function ActivityFeed({ entries, onComplete, onEstimateChange, onRemove, tasks }) {
  return (
    <section className="leslie-activity-feed" aria-label="Today activity">
      {tasks.map((task) => (
        <div className="leslie-activity-row leslie-planned-row" key={`task-${task.id}`}>
          <button aria-label={`Complete ${task.title}`} className="leslie-check" onClick={() => onComplete(task.id)} />
          <div className="leslie-activity-copy">
            <span className="leslie-activity-kind">Planned</span>
            <strong>{task.title}</strong>
          </div>
          <label className="leslie-visually-hidden" htmlFor={`leslie-estimate-${task.id}`}>Expected time for {task.title}</label>
          <select
            className="leslie-estimate-select"
            id={`leslie-estimate-${task.id}`}
            onChange={(event) => {
              const estimate = parseEstimatedMinutes(event.target.value);
              if (estimate !== null) onEstimateChange(task.id, estimate);
            }}
            value={task.estimatedMinutes}
          >
            {estimates.map((estimate) => <option key={estimate} value={estimate}>{formatDuration(estimate)}</option>)}
          </select>
          <button className="leslie-remove" onClick={() => onRemove(task.id)}>Remove</button>
        </div>
      ))}
      {entries.map((entry) => (
        <div className="leslie-activity-row leslie-log-row" key={`log-${entry.id}`}>
          <time>{entry.time}</time>
          <div className="leslie-activity-copy">
            <span className="leslie-activity-kind">Did</span>
            <p>{entry.note}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

export function Prototype() {
  const [lists, setLists] = useState(initialLists);
  const [activeList, setActiveList] = useState("Inbox");
  const [timeScale, setTimeScale] = useState("day");
  const [tasks, setTasks] = useState(initialTasks);
  const [log, setLog] = useState(initialLog);
  const [removedTask, setRemovedTask] = useState(null);

  const visibleTasks = useMemo(() => tasks.filter((task) => task.list === activeList), [activeList, tasks]);

  function addTask(title, estimatedMinutes) {
    setTasks((current) => [{ id: Date.now(), list: activeList, title, estimatedMinutes }, ...current]);
  }

  function addList(name) {
    const existingList = lists.find((list) => list.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (existingList) {
      setActiveList(existingList);
      return;
    }
    setLists((current) => [...current, name]);
    setActiveList(name);
  }

  function addLogEntry(note) {
    setLog((current) => [{ id: Date.now(), time: currentTime(), note }, ...current]);
  }

  function completeTask(id) {
    const task = tasks.find((candidate) => candidate.id === id);
    if (!task) return;
    setTasks((current) => current.filter((candidate) => candidate.id !== id));
    addLogEntry(`Completed ${task.title}.`);
  }

  function changeEstimate(id, estimatedMinutes) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, estimatedMinutes } : task)));
  }

  function removeTask(id) {
    const task = tasks.find((candidate) => candidate.id === id);
    if (!task) return;
    setRemovedTask(task);
    setTasks((current) => current.filter((candidate) => candidate.id !== id));
  }

  function undoRemove() {
    if (!removedTask) return;
    setTasks((current) => [removedTask, ...current]);
    setRemovedTask(null);
  }

  return (
    <main className="worklog-prototype">
      <Sidebar activeList={activeList} lists={lists} onAddList={addList} onSelect={setActiveList} />
      <div className="leslie-workspace">
        <header className="leslie-page-header">
          <label className="leslie-visually-hidden" htmlFor="leslie-time-scale">Time scale</label>
          <select
            className="leslie-time-scale"
            id="leslie-time-scale"
            onChange={(event) => {
              const nextScale = parseTimeScale(event.target.value);
              if (nextScale !== null) setTimeScale(nextScale);
            }}
            value={timeScale}
          >
            <option value="day">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          <p>{timeScaleDate(timeScale)}</p>
        </header>
        <div className="leslie-stream">
          <CaptureComposer onAddLog={addLogEntry} onAddTask={addTask} />
          <ActivityFeed
            entries={log}
            onComplete={completeTask}
            onEstimateChange={changeEstimate}
            onRemove={removeTask}
            tasks={visibleTasks}
          />
        </div>
      </div>
      {removedTask ? (
        <div className="leslie-toast" role="status">
          Planned item removed
          <button onClick={undoRemove}>Undo</button>
        </div>
      ) : null}
    </main>
  );
}
