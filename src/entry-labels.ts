export interface LabeledEntryText {
  readonly labels: readonly string[];
  readonly text: string;
}

const ENTRY_LABEL = /(^|\s)@([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;

/** Separate @labels from entry text without treating email addresses as labels. */
export function parseEntryLabels(value: string): LabeledEntryText {
  const labels: string[] = [];
  const seen = new Set<string>();
  const text = value.replace(ENTRY_LABEL, (_match, prefix: string, label: string) => {
    const normalized = label.toLocaleLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      labels.push(`@${label}`);
    }
    return prefix;
  });

  return {
    labels,
    text: text
      .replace(/\s+/gu, " ")
      .replace(/\s+([,.;:!?])/gu, "$1")
      .trim(),
  };
}
