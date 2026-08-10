import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  CHECK_LIST,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  LINK,
  QUOTE,
  UNORDERED_LIST,
} from "@lexical/markdown";
import type { Transformer } from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

/** Lexical nodes allowed in task notes. */
export const NOTES_EDITOR_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode];

/** Markdown syntax supported by task notes, ordered for deterministic parsing. */
export const NOTES_MARKDOWN_TRANSFORMERS: Transformer[] = [
  HEADING,
  QUOTE,
  CHECK_LIST,
  UNORDERED_LIST,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  ITALIC_STAR,
  LINK,
];

/** Import persisted task-note Markdown into the active Lexical update. */
export function $importNotesMarkdown(markdown: string): void {
  $convertFromMarkdownString(markdown, NOTES_MARKDOWN_TRANSFORMERS, undefined, true);
}

/** Export the active Lexical editor state to persisted task-note Markdown. */
export function $exportNotesMarkdown(): string {
  return $convertToMarkdownString(NOTES_MARKDOWN_TRANSFORMERS, undefined, true).trimEnd();
}
