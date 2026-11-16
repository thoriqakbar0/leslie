type NotesAutosaveState =
  | { readonly kind: "idle"; readonly emittedMarkdown: string }
  | {
      readonly kind: "scheduled";
      readonly emittedMarkdown: string;
      readonly timer: ReturnType<typeof setTimeout>;
    };

export function createNotesAutosave({
  initialMarkdown,
  readMarkdown,
  onMarkdownChange,
  delayMs,
}: {
  readonly initialMarkdown: string;
  readonly readMarkdown: () => string;
  readonly onMarkdownChange: (markdown: string) => void;
  readonly delayMs: number;
}) {
  let state: NotesAutosaveState = { kind: "idle", emittedMarkdown: initialMarkdown };

  function flush() {
    if (state.kind === "scheduled") clearTimeout(state.timer);
    const previous = state.emittedMarkdown;
    const markdown = readMarkdown();
    state = { kind: "idle", emittedMarkdown: markdown };
    if (markdown !== previous) onMarkdownChange(markdown);
  }

  return {
    flush,
    schedule: () => {
      if (state.kind === "scheduled") clearTimeout(state.timer);
      state = {
        kind: "scheduled",
        emittedMarkdown: state.emittedMarkdown,
        timer: setTimeout(flush, delayMs),
      };
    },
  };
}
