import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { $getListDepth, $isListItemNode, $isListNode } from "@lexical/list";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  INDENT_CONTENT_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  TextNode,
} from "lexical";
import { useCallback, useEffect, useRef } from "react";
import {
  $exportNotesMarkdown,
  $importNotesMarkdown,
  NOTES_EDITOR_NODES,
  NOTES_MARKDOWN_TRANSFORMERS,
} from "../notes-editor-config";
import { $expandNowAtSelection, $highlightClockTextNode } from "../notes-now";

const SAVE_DELAY_MS = 200;

interface MarkdownNotesEditorProps {
  readonly ariaLabel: string;
  readonly markdown: string;
  readonly onEscape: () => void;
  readonly onMarkdownChange: (markdown: string) => void;
}

interface PersistencePluginProps {
  readonly initialMarkdown: string;
  readonly onEscape: () => void;
  readonly onMarkdownChange: (markdown: string) => void;
}

const MAX_CHECKLIST_DEPTH = 4;

function NowShortcutPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    function expandAtSelection(insertSpace: boolean): boolean {
      return $expandNowAtSelection(Date.now(), insertSpace);
    }

    const unregisterSpace = editor.registerCommand(
      KEY_SPACE_COMMAND,
      (event) => {
        if (!expandAtSelection(true)) return false;
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        expandAtSelection(false);
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
    return () => {
      unregisterSpace();
      unregisterEnter();
    };
  }, [editor]);

  return null;
}

function ClockHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => editor.registerNodeTransform(TextNode, $highlightClockTextNode), [editor]);

  return null;
}

function ChecklistIndentPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          let node = selection.anchor.getNode();
          while (!$isListItemNode(node)) {
            const parent = node.getParent();
            if (parent === null) return false;
            node = parent;
          }
          const list = node.getParent();
          if (!$isListNode(list)) return false;
          if (
            !event.shiftKey &&
            (node.getPreviousSibling() === null || $getListDepth(list) >= MAX_CHECKLIST_DEPTH)
          ) {
            return false;
          }

          event.preventDefault();
          return editor.dispatchCommand(
            event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
            undefined,
          );
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    [editor],
  );

  return null;
}

function PersistencePlugin({
  initialMarkdown,
  onEscape,
  onMarkdownChange,
}: PersistencePluginProps) {
  const [editor] = useLexicalComposerContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef(initialMarkdown);
  const onEscapeRef = useRef(onEscape);
  const onMarkdownChangeRef = useRef(onMarkdownChange);

  useEffect(() => {
    onEscapeRef.current = onEscape;
    onMarkdownChangeRef.current = onMarkdownChange;
  }, [onEscape, onMarkdownChange]);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const markdown = editor.getEditorState().read($exportNotesMarkdown);
    if (markdown === lastPersistedRef.current) return;
    lastPersistedRef.current = markdown;
    onMarkdownChangeRef.current(markdown);
  }, [editor]);

  useEffect(() => {
    const unregisterUpdate = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DELAY_MS);
    });
    const unregisterBlur = editor.registerCommand(
      BLUR_COMMAND,
      () => {
        flush();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const unregisterEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        event.preventDefault();
        flush();
        onEscapeRef.current();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
    const unregisterPaste = editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!(event instanceof ClipboardEvent)) return false;
        const { clipboardData } = event;
        if (clipboardData === null) return false;
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;
        event.preventDefault();
        selection.insertRawText(clipboardData.getData("text/plain"));
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      unregisterUpdate();
      unregisterBlur();
      unregisterEscape();
      unregisterPaste();
      flush();
    };
  }, [editor, flush]);

  return null;
}

/** Render a fast rich-text surface while persisting task notes as Markdown. */
export function MarkdownNotesEditor({
  ariaLabel,
  markdown,
  onEscape,
  onMarkdownChange,
}: MarkdownNotesEditorProps) {
  return (
    <LexicalComposer
      initialConfig={{
        editorState: () => $importNotesMarkdown(markdown),
        namespace: "LeslieTaskNotes",
        nodes: NOTES_EDITOR_NODES,
        onError: (error) => {
          throw error;
        },
        theme: {
          list: {
            checklist: "rich-checklist",
            listitemChecked: "rich-checklist-item is-checked",
            listitemUnchecked: "rich-checklist-item",
            nested: {
              listitem: "rich-checklist-nested-item",
            },
          },
        },
      }}
    >
      <div className="notes-editor-surface">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-label={ariaLabel}
              aria-multiline="true"
              className="rich-notes-editor"
              id="notes-rich-editor"
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
          placeholder={<div className="rich-notes-placeholder">Write notes…</div>}
        />
      </div>
      <AutoFocusPlugin defaultSelection="rootEnd" />
      <HistoryPlugin />
      <ListPlugin />
      <CheckListPlugin />
      <ChecklistIndentPlugin />
      <ClockHighlightPlugin />
      <NowShortcutPlugin />
      <MarkdownShortcutPlugin transformers={NOTES_MARKDOWN_TRANSFORMERS} />
      <PersistencePlugin
        initialMarkdown={markdown}
        onEscape={onEscape}
        onMarkdownChange={onMarkdownChange}
      />
    </LexicalComposer>
  );
}
