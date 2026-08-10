/** Map Leslie's date-navigation keys to their scale movement direction. */
export function dateShortcutDirection(key: string): -1 | 1 | null {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey === "h") return -1;
  if (normalizedKey === "l") return 1;
  return null;
}

/** Return whether a keyboard event targets a field where users enter text. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select") !== null) return true;
  const editable = target.closest<HTMLElement>("[contenteditable]");
  return editable !== null && editable.contentEditable !== "false";
}
