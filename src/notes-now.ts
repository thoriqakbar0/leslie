import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setTextFormat,
  type TextNode,
} from "lexical";
import { formatCompactTime } from "./model";

/** Parse an `@now` token immediately before the cursor into a local clock replacement. */
export function expandNowShortcut(
  text: string,
  cursorOffset: number,
  timestamp: number,
): { readonly replacement: string; readonly start: number } | null {
  if (
    !Number.isSafeInteger(cursorOffset) ||
    cursorOffset < 4 ||
    cursorOffset > text.length ||
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0
  ) {
    return null;
  }
  const start = cursorOffset - 4;
  if (text.slice(start, cursorOffset) !== "@now") return null;
  const precedingCharacter = text[start - 1];
  if (precedingCharacter !== undefined && !/\s/u.test(precedingCharacter)) return null;
  return { replacement: formatCompactTime(timestamp), start };
}

/** Replace an `@now` token at the active Lexical cursor; call only inside an editor update. */
export function $expandNowAtSelection(timestamp: number, insertSpace: boolean): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const node = selection.anchor.getNode();
  if (!$isTextNode(node) || node.hasFormat("code")) return false;
  const expansion = expandNowShortcut(node.getTextContent(), selection.anchor.offset, timestamp);
  if (expansion === null) return false;
  selection.setTextNodeRange(node, expansion.start, node, expansion.start + "@now".length);
  $setTextFormat(selection, { code: true });
  selection.insertText(expansion.replacement);
  $setTextFormat(selection, { code: false });
  if (insertSpace) selection.insertText(" ");
  return true;
}

/** Highlight the first standalone 24-hour clock in a plain Lexical text node. */
export function $highlightClockTextNode(node: TextNode): boolean {
  if (node.hasFormat("code")) return false;
  const match = /(^|[\s(])((?:[01]\d|2[0-3]):[0-5]\d)(?=$|[\s.,!?;)])/u.exec(node.getTextContent());
  if (match === null) return false;
  const start = match.index + match[1].length;
  const end = start + match[2].length;
  const parts = node.splitText(start, end);
  const clockNode = parts[start === 0 ? 0 : 1];
  if (clockNode === undefined) return false;
  clockNode.toggleFormat("code");
  return true;
}
