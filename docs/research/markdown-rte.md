# A faster markdown-backed rich-text editor for Leslie

Research completed: 2026-08-11

## Question

What should replace Leslie's hand-written `contentEditable` notes editor so typing stays fast while notes remain portable Markdown?

This review uses primary sources only: official documentation, official repositories, package manifests, changelogs, and Electron release notes. No maintained project publishes a directly comparable typing benchmark for Leslie's workload. Performance conclusions below therefore separate documented architecture from measurements Leslie still needs to make.

## Recommendation

Use **Lexical 0.49.x** with a small, Leslie-owned React wrapper and a restricted Markdown transformer set.

Keep Markdown as Leslie's stored contract. Keep Lexical editor state local while the user types. Serialize Markdown through a trailing debounce and flush it on blur, task change, sidebar close, and component cleanup. Do not pass each keystroke through React application state and back into the DOM.

This is the smallest option that directly targets the current latency source without turning the notes sidebar into a document suite. Lexical describes its core as minimal and modular, keeps editor state outside React rendering, batches updates, and reconciles only changed DOM. Its official React bindings accept React 19, and its supported Chrome floor is far below Electron 43's Chromium version ([Lexical overview](https://lexical.dev/), [Lexical editor-state model](https://lexical.dev/docs/concepts/editor-state), [Lexical reconciliation](https://lexical.dev/docs/concepts/editor-state#updating-state), [`@lexical/react` package manifest](https://github.com/facebook/lexical/blob/v0.49.0/packages/lexical-react/package.json), [Lexical supported browsers](https://github.com/facebook/lexical#browser-support), [Electron 43 release](https://www.electronjs.org/blog/electron-43-0)).

Confidence is **medium-high** for architecture and compatibility. Confidence is **medium** for the size and latency win until Leslie measures its production bundle and representative notes.

## Why the current editor slows down

`src/components/NotesSidebar.tsx` handles every native `input` event by walking every top-level editor child and serializing the full document through `notesHtmlToMarkdown`. It immediately calls `onNotesChange`, which moves the complete Markdown string into application state. The effect then guards against writing that state back into `innerHTML` with a mutable `lastNotes` reference.

The same component also implements selection placement, Markdown input rules, checklist continuation, paste replacement, and state synchronization directly against browser DOM. This creates two models—the DOM and the Markdown string—without an editor transaction layer.

The browser's deprecated `Document.execCommand()` performs the paste insertion. MDN marks this API deprecated and warns that browsers may stop supporting it ([MDN `execCommand`](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand)).

These observations come from Leslie's current source. They are not proof of one isolated bottleneck. The migration should include local typing measurements before removing the old path.

## Options

| Option | Typing architecture | Markdown and shortcuts | Checklists | React 19 and Electron | Dependency shape | Maintenance signal | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Lexical** | Immutable editor states, batched updates, and DOM reconciliation are owned by the editor rather than React application renders ([editor state](https://lexical.dev/docs/concepts/editor-state)). | Official Markdown import/export and `MarkdownShortcutPlugin`; transformers include headings, quotes, lists, check lists, emphasis, code, and links ([serialization](https://lexical.dev/docs/concepts/serialization#markdown), [transformer source](https://github.com/facebook/lexical/blob/v0.49.0/packages/lexical-markdown/src/MarkdownTransformers.ts)). | The official `CHECK_LIST` transformer imports and exports `- [ ]` / `- [x]` through list nodes ([source](https://github.com/facebook/lexical/blob/v0.49.0/packages/lexical-markdown/src/MarkdownTransformers.ts)). | `@lexical/react` declares React and React DOM `>=18.x`; Lexical supports Chrome 86+, while Electron 43 ships Chromium 150 ([manifest](https://github.com/facebook/lexical/blob/v0.49.0/packages/lexical-react/package.json), [browsers](https://github.com/facebook/lexical#browser-support), [Electron](https://www.electronjs.org/blog/electron-43-0)). | Modular packages. Registry metadata for 0.49.0 reports unpacked package sizes of about 3.31 MB for `lexical`, 1.31 MB for `@lexical/react`, 378 KB for `@lexical/markdown`, and 330 KB for `@lexical/list`. These are package contents, not shipped bundle bytes ([npm registry](https://registry.npmjs.org/lexical/latest), [`@lexical/react`](https://registry.npmjs.org/%40lexical%2Freact/latest), [`@lexical/markdown`](https://registry.npmjs.org/%40lexical%2Fmarkdown/latest), [`@lexical/list`](https://registry.npmjs.org/%40lexical%2Flist/latest)). | Active official releases include Markdown fixes, and the changelog records React 19 testing and fixes ([releases](https://github.com/facebook/lexical/releases), [changelog](https://github.com/facebook/lexical/blob/main/CHANGELOG.md)). | **Recommend.** Best fit for a compact, custom Leslie surface. |
| **Milkdown** | A headless WYSIWYG Markdown framework built on ProseMirror and remark ([official overview](https://milkdown.dev/docs), [repository](https://github.com/Milkdown/milkdown)). ProseMirror shares unchanged document nodes and performs minimal DOM updates ([ProseMirror guide](https://prosemirror.net/docs/guide/#view.update)). | Markdown is the primary input/output model. The listener plugin emits updated Markdown, and React guidance warns against unnecessary rerenders ([React recipe](https://milkdown.dev/docs/recipes/react)). | The GFM preset is included in `@milkdown/kit`; Milkdown targets GFM through its preset and remark pipeline ([kit manifest](https://registry.npmjs.org/%40milkdown%2Fkit/latest), [repository](https://github.com/Milkdown/milkdown)). | `@milkdown/react` declares wildcard React and React DOM peers, so React 19 is accepted by the manifest ([registry](https://registry.npmjs.org/%40milkdown%2Freact/latest)). ProseMirror runs in modern browser DOM, so Electron's Chromium is suitable. | The recommended React install uses `@milkdown/react` plus `@milkdown/kit`; the React package also declares Crepe and Kit dependencies, while Kit aggregates many presets and plugins ([React recipe](https://milkdown.dev/docs/recipes/react), [registry](https://registry.npmjs.org/%40milkdown%2Freact/latest)). | Active 7.x releases and an official repository with tests and security policy ([releases](https://github.com/Milkdown/milkdown/releases), [repository](https://github.com/Milkdown/milkdown)). | Strong Markdown-first alternative, but broader dependency surface than Leslie needs. |
| **Tiptap 3** | Built on ProseMirror, whose persistent document nodes let normal updates compare old and new state and leave unchanged DOM alone ([Tiptap repository](https://github.com/ueberdosis/tiptap), [ProseMirror guide](https://prosemirror.net/docs/guide/#view.update)). | Official Markdown parsing and serialization exist, but the documentation labels the extension **Beta** and warns about unsupported edge cases ([Markdown introduction](https://tiptap.dev/docs/editor/markdown)). Input rules and keyboard shortcuts are first-class extension APIs ([custom mark guide](https://tiptap.dev/docs/guides/create-mark)). | Official TaskList supports `[ ] ` and `[x] ` input rules and keyboard commands ([TaskList](https://tiptap.dev/docs/editor/extensions/nodes/task-list)). | `@tiptap/react` explicitly accepts React 17, 18, or 19. Electron's Chromium supports the browser primitives ProseMirror uses ([registry](https://registry.npmjs.org/%40tiptap%2Freact/latest), [Electron](https://www.electronjs.org/blog/electron-43-0)). | Headless and selectable, but the needed React, ProseMirror, StarterKit, list, and Markdown packages create a multi-package graph ([StarterKit registry](https://registry.npmjs.org/%40tiptap%2Fstarter-kit/latest), [Markdown registry](https://registry.npmjs.org/%40tiptap%2Fmarkdown/latest)). | Very active releases. The Markdown changelog shows frequent round-trip fixes, which is good maintenance evidence but also confirms a still-moving surface ([Markdown changelog](https://tiptap.dev/docs/resources/changelog/markdown)). | Do not choose while Markdown remains Beta unless Leslie needs Tiptap extensions. |
| **BlockNote** | Complete block editor built on Tiptap and ProseMirror, with ready-made React UI ([introduction](https://www.blocknotejs.org/docs), [repository](https://github.com/TypeCellOS/BlockNote)). | Official docs explicitly call Markdown import/export lossy and recommend JSON for non-lossy storage ([Markdown import](https://www.blocknotejs.org/docs/features/import/markdown)). | Check-list blocks are built in ([list types](https://www.blocknotejs.org/docs/features/blocks/list-types)). | React bindings accept React 18 and 19 ([registry](https://registry.npmjs.org/%40blocknote%2Freact/latest)). Electron's Chromium is suitable. | Core and React packages include Tiptap, ProseMirror, emoji, floating UI, and store dependencies; registry unpacked sizes are about 8.81 MB and 20.48 MB respectively, before a view package ([core registry](https://registry.npmjs.org/%40blocknote%2Fcore/latest), [React registry](https://registry.npmjs.org/%40blocknote%2Freact/latest)). | Active releases and browser tests. Most packages use MPL-2.0, unlike Leslie's other MIT candidates ([repository](https://github.com/TypeCellOS/BlockNote), [releases](https://github.com/TypeCellOS/BlockNote/releases)). | Reject. Its block suite and lossy Markdown contract conflict with Leslie's compact Markdown notes. |

## Important fidelity boundary

No rich-text model can promise byte-for-byte Markdown preservation after editing unless it retains source tokens and whitespace separately. Leslie should promise **semantic round-trip fidelity for its supported subset**, not identical source text.

For the first migration, support only:

- paragraphs and blank lines;
- `#` and `##` headings;
- block quotes;
- bullet lists;
- task lists with `- [ ]` and `- [x]`;
- bold, italic, inline code, and links.

Lexical's import/export functions accept a chosen transformer array, so Leslie can explicitly define this contract instead of enabling every default transformer ([Markdown serialization](https://lexical.dev/docs/concepts/serialization#markdown), [Markdown API](https://lexical.dev/docs/api/modules/lexical_markdown)).

Test semantic normalization explicitly. For example, importing `* item` may export `- item`, emphasis delimiters may normalize, and trailing whitespace may change. Existing stored notes outside the supported subset must remain visible as literal text or block migration with an actionable error; they must not disappear silently.

## Paste safety

Keep Leslie's current product rule: ordinary paste inserts plain text, not clipboard HTML.

Lexical exposes commands as the supported extension point, including registered command handlers with explicit priorities ([commands](https://lexical.dev/docs/concepts/commands)). Implement a high-priority `PASTE_COMMAND` handler that reads `text/plain`, inserts text through Lexical selection APIs, and returns `true`. Do not inject clipboard HTML or call `execCommand`.

This rule prevents markup from the clipboard from entering the document model. It is not a complete security boundary. Continue rendering stored Markdown through editor nodes, never through unsanitized `innerHTML`.

## Proposed architecture

```text
stored task Markdown
        |
        v
Lexical initial editor state -- one import when task opens
        |
        v
local Lexical transactions -- typing, history, input rules, checklists
        |
        +-- 200 ms trailing debounce --> Markdown serializer --> onNotesChange
        |
        +-- blur / close / task change / cleanup --> synchronous flush
```

Rules:

1. Create one editor instance per mounted notes sidebar.
2. Import Markdown once for the selected task.
3. Do not call `setEditorState` for the editor's own emitted updates.
4. Treat a changed `taskTitle` or task identifier as an external document switch.
5. Debounce persistence, not editor transactions.
6. Flush before closing or switching tasks so no note is lost.
7. Keep the existing Markdown string as the database and IPC contract.
8. Keep editor JSON ephemeral. Do not add a second persisted source of truth.

Lexical warns that update listeners which schedule another update create a second DOM update. Its node transforms run in the same update and are the preferred mechanism for transformations ([listeners and transforms](https://lexical.dev/docs/concepts/listeners#waterfall-updates)). Use the official Markdown shortcut plugin or transforms rather than a React effect that rewrites the editor.

## Migration plan

### Phase 0: measure the current editor

Add a development-only fixture with notes of roughly 1 KB, 10 KB, and 50 KB. Record:

- keydown-to-next-paint latency for 100 characters;
- long tasks over 50 ms;
- React commits per character;
- Markdown persistence calls per character;
- production renderer bundle size.

Use the same Electron production renderer for before-and-after measurements. Browser framework claims cannot replace Leslie's own measurements.

### Phase 1: define the Markdown contract

Move the supported transformer list and normalization fixtures into a focused module, for example `src/notes-editor/markdown.ts`.

Convert the current `src/notes-markdown.ts` tests into table-driven fixtures that assert:

- Markdown import succeeds;
- export then import preserves document meaning;
- task-list checked state survives;
- literal `<script>` and pasted HTML remain text;
- nested or unsupported input never disappears;
- Unicode, combining marks, emoji, and bidirectional text survive;
- blank documents and trailing blank lines follow one documented rule.

Keep `src/notes-markdown.ts` temporarily as the legacy adapter. Remove it only after stored-note fixtures pass through the new adapter.

### Phase 2: add a narrow editor component

Create `src/components/MarkdownNotesEditor.tsx` with only these props:

```ts
interface MarkdownNotesEditorProps {
  readonly ariaLabel: string;
  readonly markdown: string;
  readonly onMarkdownChange: (markdown: string) => void;
  readonly onEscape: () => void;
}
```

Use these packages first:

```text
lexical
@lexical/react
@lexical/rich-text
@lexical/history
@lexical/list
@lexical/markdown
```

Verify the actual dependency graph with Nub before committing. Import only the plugins and nodes Leslie uses. Do not copy the Lexical playground.

Configure:

- `RichTextPlugin` and `ContentEditable`;
- `HistoryPlugin`;
- `ListPlugin` and list nodes;
- `MarkdownShortcutPlugin` with Leslie's transformer array;
- a small update listener that schedules Markdown persistence;
- a plain-text paste command;
- an Escape command that closes notes;
- an error boundary that reports invariants without losing stored Markdown.

### Phase 3: replace the sidebar implementation

In `src/components/NotesSidebar.tsx`, replace the hand-written editable `<div>` with `MarkdownNotesEditor`.

Delete direct DOM mutation, `placeCaretAtEnd`, manual checklist cloning, `document.execCommand`, and the `lastNotes` synchronization guard. Keep the sidebar header, task title, close action, hint, and existing layout tokens.

### Phase 4: verify behavior and performance

Require all existing checks plus targeted editor tests:

1. type plain text without a parent React commit per key;
2. type `- `, `- [ ] `, `# `, `## `, and `> ` at an empty block;
3. continue and exit bullet and task lists with Enter;
4. toggle a task checkbox and persist `- [x]`;
5. use `Cmd+B`, `Cmd+I`, undo, and redo;
6. paste HTML and verify only visible plain text enters;
7. close immediately after typing and verify the final text persists;
8. switch tasks during a pending debounce and verify both notes;
9. reopen all stored-note fixtures;
10. test keyboard, VoiceOver labels, IME composition, spellcheck, and 200% zoom;
11. rerun the 1 KB, 10 KB, and 50 KB latency fixture;
12. compare the production renderer bundle and startup time.

Set an acceptance target before implementation. A useful initial gate is no repeated frame over 16.7 ms while typing the 10 KB fixture, no long task over 50 ms, and no note loss. Adjust only from measured baseline evidence.

### Phase 5: remove the old path

Remove `src/notes-markdown.ts` after the new Markdown adapter passes every legacy fixture and the production migration test. Do not keep two active editors or two serializers.

## Why not migrate directly to Milkdown?

Milkdown is the best second choice when Markdown authoring is the product itself. Its official Markdown listener and remark pipeline reduce custom serialization work ([React integration](https://milkdown.dev/docs/recipes/react), [overview](https://milkdown.dev/docs)).

Leslie needs a focused task-notes field with six block and inline concepts. Lexical lets Leslie assemble that surface without Crepe, slash menus, collaboration, upload, streaming, tooltip, and other Kit features. This is an architectural size judgment, not a measured bundle result. If the Lexical spike fails semantic round-trip fixtures, run the same benchmark with Milkdown core plus CommonMark/GFM before choosing Tiptap.

## Decision gate

Adopt Lexical only if the spike proves all four conditions:

1. every current stored-note fixture preserves meaning;
2. plain-text paste and immediate-close persistence pass;
3. the 10 KB typing trace removes the current long tasks;
4. the production renderer size increase is acceptable to Leslie.

If condition 1 fails because Leslie needs broader Markdown fidelity, test Milkdown next. If only source spelling differs, document canonical Markdown normalization rather than adding a second persisted format.
