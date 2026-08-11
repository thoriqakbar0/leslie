/** Return a stable visual tone for a folder without using its display name. */
export function folderTone(listId: string): 0 | 1 | 2 | 3 {
  let hash = 0;
  for (const character of listId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  switch (hash % 4) {
    case 0:
      return 0;
    case 1:
      return 1;
    case 2:
      return 2;
    default:
      return 3;
  }
}
