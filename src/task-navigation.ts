/** Return the task index targeted by a j/k navigation key. */
export function taskNavigationIndex(
  itemCount: number,
  currentIndex: number,
  key: "j" | "k",
): number | null {
  if (itemCount <= 0) return null;
  if (currentIndex < 0 || currentIndex >= itemCount) return key === "j" ? 0 : itemCount - 1;
  const offset = key === "j" ? 1 : -1;
  return Math.max(0, Math.min(itemCount - 1, currentIndex + offset));
}
