import {
  removeWorkLogEntry,
  restoreWorkLogEntry,
  type EstimateMinutes,
  type LeslieState,
  type PlannedItem,
  type TaskList,
  type WorkLogEntry,
} from "./model";

export type NotesTarget =
  | { readonly kind: "task"; readonly id: string }
  | { readonly kind: "log"; readonly id: string };

export type RemovedItem =
  | { readonly kind: "task"; readonly task: PlannedItem }
  | { readonly kind: "log"; readonly entry: WorkLogEntry }
  | {
      readonly kind: "list";
      readonly list: TaskList;
      readonly tasks: readonly PlannedItem[];
      readonly workLog: readonly WorkLogEntry[];
    };

type HistoryStamp = { readonly historyId: string; readonly occurredAt: number };

export type DocumentEvent =
  | { readonly kind: "list-selected"; readonly id: string }
  | { readonly kind: "list-added"; readonly id: string; readonly name: string }
  | { readonly kind: "list-renamed"; readonly id: string; readonly name: string }
  | { readonly kind: "list-removed"; readonly id: string }
  | ({
      readonly kind: "task-added";
      readonly id: string;
      readonly title: string;
      readonly estimatedMinutes: EstimateMinutes;
      readonly scheduledAt: number;
    } & HistoryStamp)
  | ({
      readonly kind: "log-added";
      readonly id: string;
      readonly note: string;
      readonly createdAt: number;
    } & HistoryStamp)
  | ({
      readonly kind: "task-completed";
      readonly id: string;
      readonly createdAt: number;
    } & HistoryStamp)
  | {
      readonly kind: "estimate-changed";
      readonly id: string;
      readonly estimatedMinutes: EstimateMinutes;
    }
  | ({
      readonly kind: "title-changed";
      readonly target: NotesTarget;
      readonly title: string;
    } & HistoryStamp)
  | { readonly kind: "log-time-changed"; readonly id: string; readonly createdAt: number }
  | { readonly kind: "task-moved"; readonly id: string; readonly listId: string }
  | { readonly kind: "notes-changed"; readonly target: NotesTarget; readonly notes: string }
  | { readonly kind: "task-removed"; readonly id: string }
  | { readonly kind: "log-removed"; readonly id: string }
  | { readonly kind: "removal-undone"; readonly removed: RemovedItem };

export function documentReducer(state: LeslieState, event: DocumentEvent): LeslieState {
  switch (event.kind) {
    case "list-selected":
      return { ...state, activeListId: event.id };
    case "list-added": {
      const existing = state.lists.find(
        (list) => list.name.localeCompare(event.name, undefined, { sensitivity: "base" }) === 0,
      );
      if (existing) return { ...state, activeListId: existing.id };
      return {
        ...state,
        lists: [...state.lists, { id: event.id, name: event.name }],
        activeListId: event.id,
      };
    }
    case "list-renamed": {
      const duplicate = state.lists.some(
        (list) =>
          list.id !== event.id &&
          list.name.localeCompare(event.name, undefined, { sensitivity: "base" }) === 0,
      );
      return duplicate
        ? state
        : {
            ...state,
            lists: state.lists.map((list) =>
              list.id === event.id ? { ...list, name: event.name } : list,
            ),
          };
    }
    case "list-removed": {
      if (state.lists.length <= 1 || !state.lists.some((list) => list.id === event.id))
        return state;
      const lists = state.lists.filter((list) => list.id !== event.id);
      const next = lists.find((list) => list.id === "inbox") ?? lists[0];
      if (!next) return state;
      return {
        ...state,
        lists,
        activeListId: next.id,
        tasks: state.tasks.filter((task) => task.listId !== event.id),
        workLog: state.workLog.map((entry) =>
          entry.listId === event.id ? { ...entry, listId: next.id } : entry,
        ),
      };
    }
    case "task-added":
      return {
        ...state,
        tasks: [
          {
            id: event.id,
            listId: state.activeListId,
            title: event.title,
            notes: "",
            estimatedMinutes: event.estimatedMinutes,
            scheduledAt: event.scheduledAt,
          },
          ...state.tasks,
        ],
        history: [
          {
            id: event.historyId,
            itemId: event.id,
            type: "planned-created",
            title: event.title,
            occurredAt: event.occurredAt,
          },
          ...state.history,
        ],
      };
    case "log-added":
      return {
        ...state,
        workLog: [
          {
            id: event.id,
            listId: state.activeListId,
            note: event.note,
            notes: "",
            origin: "direct",
            createdAt: event.createdAt,
          },
          ...state.workLog,
        ],
        history: [
          {
            id: event.historyId,
            itemId: event.id,
            type: "did-created",
            title: event.note,
            occurredAt: event.occurredAt,
          },
          ...state.history,
        ],
      };
    case "task-completed": {
      const task = state.tasks.find((task) => task.id === event.id);
      if (!task) return state;
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== event.id),
        workLog: [
          {
            id: task.id,
            listId: task.listId,
            note: `Completed ${task.title}.`,
            notes: task.notes,
            origin: "planned",
            createdAt: event.createdAt,
          },
          ...state.workLog,
        ],
        history: [
          {
            id: event.historyId,
            itemId: task.id,
            type: "planned-completed",
            title: task.title,
            occurredAt: event.occurredAt,
          },
          ...state.history,
        ],
      };
    }
    case "estimate-changed":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === event.id ? { ...task, estimatedMinutes: event.estimatedMinutes } : task,
        ),
      };
    case "title-changed": {
      const { target, title } = event;
      const previousTitle =
        target.kind === "task"
          ? state.tasks.find((task) => task.id === target.id)?.title
          : state.workLog.find((entry) => entry.id === target.id)?.note;
      if (previousTitle === undefined || previousTitle === title) return state;
      return {
        ...state,
        tasks:
          target.kind === "task"
            ? state.tasks.map((task) => (task.id === target.id ? { ...task, title } : task))
            : state.tasks,
        workLog:
          target.kind === "log"
            ? state.workLog.map((entry) =>
                entry.id === target.id ? { ...entry, note: title } : entry,
              )
            : state.workLog,
        history: [
          {
            id: event.historyId,
            itemId: target.id,
            itemKind: target.kind === "task" ? "planned" : "did",
            type: "title-changed",
            previousTitle,
            title,
            occurredAt: event.occurredAt,
          },
          ...state.history,
        ],
      };
    }
    case "log-time-changed":
      return {
        ...state,
        workLog: state.workLog.map((entry) =>
          entry.id === event.id && entry.createdAt !== event.createdAt
            ? { ...entry, createdAt: event.createdAt }
            : entry,
        ),
      };
    case "task-moved":
      if (!state.lists.some((list) => list.id === event.listId)) return state;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === event.id && task.listId !== event.listId
            ? { ...task, listId: event.listId }
            : task,
        ),
      };
    case "notes-changed":
      return event.target.kind === "task"
        ? {
            ...state,
            tasks: state.tasks.map((task) =>
              task.id === event.target.id && task.notes !== event.notes
                ? { ...task, notes: event.notes }
                : task,
            ),
          }
        : {
            ...state,
            workLog: state.workLog.map((entry) =>
              entry.id === event.target.id && entry.notes !== event.notes
                ? { ...entry, notes: event.notes }
                : entry,
            ),
          };
    case "task-removed":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== event.id) };
    case "log-removed": {
      const result = removeWorkLogEntry(state.workLog, event.id);
      return result ? { ...state, workLog: result.workLog } : state;
    }
    case "removal-undone": {
      const { removed } = event;
      switch (removed.kind) {
        case "task":
          return { ...state, tasks: [removed.task, ...state.tasks] };
        case "log":
          return { ...state, workLog: restoreWorkLogEntry(state.workLog, removed.entry) };
        case "list":
          return {
            ...state,
            lists: [...state.lists, removed.list],
            activeListId: removed.list.id,
            tasks: [...removed.tasks, ...state.tasks],
            workLog: state.workLog.map(
              (entry) => removed.workLog.find((candidate) => candidate.id === entry.id) ?? entry,
            ),
          };
      }
    }
  }
}
