# Leslie state machines

Leslie keeps independent interactions independent. Domain events own transitions that must update several fields together. These are local typed machines, without a state-machine dependency or a global UI event bus. The persisted document and SQLite schema are unchanged.

## Ownership and transitions

| Machine                       | Owner                                                                              | States and events                                                                                                                   | Invariant                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playback                      | `src/playback.ts`                                                                  | Stopped, running, paused. Toggle, tick, stop.                                                                                       | Only an active session has a task and elapsed time. Switching tasks resets time. Pausing retains it. Late ticks do nothing after pause or stop.                                  |
| Date navigation               | `src/date-navigation.ts`                                                           | Scale, anchor, and transition motion. Move, select, scale.                                                                          | Movement uses the current scale. Date selection retains the clock. Scale changes reset animation direction.                                                                      |
| Document lifecycle            | `src/document-transitions.ts`                                                      | Planned task, factual log, removed snapshot. Named document events cover creation, correction, move, completion, removal, and undo. | Completion keeps identity, notes, and folder while recording history once. Removing a folder reassigns logs. Undo restores its snapshot.                                         |
| Document session              | `src/document-session.ts`, `src/document-writer.ts`, `src/use-document-session.ts` | Loading, then ready. Ready persistence is loaded, dirty, saving, saved, or failed. Load, edit, save-started, save-settled.          | Hydration is revision zero and does not enqueue another save. Writes serialize. Only the current revision changes the warning. A warning remains visible during a pending retry. |
| Inline title and time editing | `src/inline-edit.ts`, `src/components/ActivityFeed.tsx`                            | Idle or editing a draft. Start, change, finish.                                                                                     | Finish consumes the draft synchronously before callbacks, so Enter or Escape followed by blur cannot commit twice. Title and time sessions are independent.                      |
| Folder creation and rename    | `src/inline-edit.ts`, `src/components/Sidebar.tsx`                                 | Independent idle or editing sessions. Start, change, finish.                                                                        | Rename does not clear a creation draft. Empty creation stays open. Empty rename closes without saving. Escape cancels rename.                                                    |
| Notes autosave                | `src/notes-autosave.ts`                                                            | Idle or scheduled with a timer and last emitted Markdown. Schedule, flush.                                                          | A new schedule replaces the timer. Timeout, blur, Escape, and unmount share flush. Unchanged Markdown emits nothing. Emission to React does not mean SQLite has saved it.        |
| Database ownership            | `electron/main.mjs`                                                                | Unopened, open with connection, failed, closed. Startup and before-quit.                                                            | Only open owns a connection. IPC requires open. Shutdown consumes the connection before closing it.                                                                              |

## Small machines that already have an explicit representation

These remain in their existing owners. A boolean fully describes an independent two-state control. A nullable target describes closed versus open with a payload. Wrapping either in a framework would add another representation without removing invalid combinations.

| Machine                   | Owner and representation                  | Transitions                                                                                                                        |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Date picker               | `App.tsx`, boolean                        | Toggle, outside pointer, select, Escape, open notes. Only select and Escape restore date-button focus.                             |
| Notes panel               | `App.tsx`, `NotesTarget` or null          | Open task or log, close, select folder, remove target. Opening notes closes the date picker. Opening the picker leaves notes open. |
| Undo availability         | `App.tsx`, `RemovedItem` or null          | Removal replaces the snapshot. Undo or five-second expiry consumes it.                                                             |
| Folder move picker        | `ActivityFeed.tsx`, task ID or null       | M or button opens. Selection, blur, or Escape closes.                                                                              |
| Timeline sort             | `ActivityFeed.tsx`, newest or oldest      | Toggle reverses order.                                                                                                             |
| Capture mode              | `model.ts`, planned or did                | Switch retains draft and estimate. Submit clears only the text.                                                                    |
| Capture autofocus         | `CaptureComposer.tsx`, boolean ref        | Waiting becomes consumed once the focused window is idle or capture already has focus.                                             |
| Capture selection command | `CaptureComposer.tsx`, range or null      | Clock completion schedules a range. The layout effect consumes it.                                                                 |
| Calendar month            | `DatePicker.tsx`, visible month           | Arrows and calendar shortcuts select the visible month. DOM owns focused day.                                                      |
| Storage result            | `storage.ts`, success or failure union    | Load SQLite, import legacy data only if empty, save before returning imported data.                                                |
| Schema migration          | `sqlite-storage.mjs`, SQLite user version | Supported versions migrate transactionally to version six. Unsupported versions fail.                                              |
| SQLite connection closure | `sqlite-storage.mjs`, boolean             | Close is idempotent. SQLite rejects operations on a closed connection.                                                             |

Text, estimates, timestamps, and the sampled live clock are values rather than separate application lifecycles. Lexical owns selection, composition, and editor history. Electron owns ready-to-show, window recreation, and process lifecycle. SQLite owns transaction commit and rollback. Leslie does not duplicate those framework states.

## Design choices

A global reducer was considered and rejected. It would couple timers, DOM focus, persistence promises, and unrelated drafts. Separate domain reducers expose meaningful event vocabularies while keeping effects in React or Electron. Synchronous editor ownership is necessary because React batching alone cannot reject a second finish callback before the next render.

Document events carry generated IDs and timestamps. Reducers stay pure when React replays them. App handlers retain responsibility for focus, playback cancellation, and undo availability. The document reducer owns changes to durable collections and history.

## Verification

Run the repository checks with Nub. On machines with tight process limits, use `nub run test --maxWorkers=2` and constrain CPU affinity for `vp check` if needed.

After `nub run build`, run `nub --node script/verify-state-machines.mjs` on Linux with Xvfb installed. It launches the production Electron renderer, uses a temporary data directory, drives the real controls, and reads back SQLite through the preload bridge. It covers playback, title commit and cancellation, notes flush, independent folder drafts, completion, undo, picker focus, and reload persistence. A temporary main-process fixture delays or fails selected IPC writes while delegating successful writes to the real storage handler. It verifies write ordering, warning recovery, and hydration without duplicate writes. It never uses your normal Leslie profile. An optional argument selects another built checkout for a baseline comparison.

## Existing recovery concern

The behavior-preserving migration retains the existing failed-load policy. A failed load shows sample data and a storage warning. Subsequent edits still attempt saves. If a read failed but a later write succeeds, that fallback can replace unread data. A recovery change needs a separate contract and coverage for retaining the original database and recovering unsaved edits. The new session model identifies load failure explicitly, making that follow-up possible without another flag hidden in App. This concern is tracked in [issue #2](https://github.com/thoriqakbar0/leslie/issues/2).
