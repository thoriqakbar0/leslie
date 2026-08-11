/** One display segment from an entry title containing optional @labels. */
export type LabeledEntryPart =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "label"; readonly value: string };

/** Parsed entry text with labels available for display and filtering. */
export interface LabeledEntryText {
  readonly labels: readonly string[];
  readonly parts: readonly LabeledEntryPart[];
  readonly text: string;
}

const ENTRY_LABEL = /(^|\s)@([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;

/** Separate @labels from entry text without treating email addresses as labels. */
export function parseEntryLabels(value: string): LabeledEntryText {
  const labels: string[] = [];
  const parts: LabeledEntryPart[] = [];
  const seen = new Set<string>();
  let cursor = 0;

  for (const match of value.matchAll(ENTRY_LABEL)) {
    const label = match[2];
    if (label === undefined) continue;

    const matchStart = match.index;
    const labelStart = matchStart + (match[1]?.length ?? 0);
    const beforeLabel = value.slice(cursor, labelStart);
    if (beforeLabel.length > 0) parts.push({ kind: "text", value: beforeLabel });

    const normalized = label.toLocaleLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      const value = `@${label}`;
      labels.push(value);
      parts.push({ kind: "label", value });
    }
    cursor = matchStart + match[0].length;
  }

  const afterLastLabel = value.slice(cursor);
  if (afterLastLabel.length > 0) parts.push({ kind: "text", value: afterLastLabel });

  const text = value.replace(ENTRY_LABEL, (_match, prefix: string) => prefix);

  return {
    labels,
    parts,
    text: text
      .replace(/\s+/gu, " ")
      .replace(/\s+([,.;:!?])/gu, "$1")
      .trim(),
  };
}
