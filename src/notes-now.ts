import { $getSelection, $isRangeSelection, $isTextNode } from "lexical";
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
  node.spliceText(expansion.start, 4, expansion.replacement, true);
  if (insertSpace) selection.insertText(" ");
  return true;
}
