function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/gu, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/gu, "<em>$1</em>");
}

export function notesMarkdownToHtml(markdown: string): string {
  const blocks: string[] = [];
  let listType: "bullet" | "checklist" | null = null;

  function closeList() {
    if (listType === null) return;
    blocks.push("</ul>");
    listType = null;
  }

  for (const line of markdown.split("\n")) {
    const checklist = /^- \[([ xX])\] (.*)$/u.exec(line);
    const bullet = /^- (.*)$/u.exec(line);
    if (checklist) {
      if (listType !== "checklist") {
        closeList();
        blocks.push('<ul class="rich-checklist">');
        listType = "checklist";
      }
      const checked = checklist[1]?.toLowerCase() === "x" ? " checked" : "";
      blocks.push(
        `<li><input aria-label="Checklist item" contenteditable="false" type="checkbox"${checked}>${inlineMarkdown(checklist[2] ?? "")}</li>`,
      );
      continue;
    }
    if (bullet) {
      if (listType !== "bullet") {
        closeList();
        blocks.push("<ul>");
        listType = "bullet";
      }
      blocks.push(`<li>${inlineMarkdown(bullet[1] ?? "")}</li>`);
      continue;
    }

    closeList();
    if (line.startsWith("## ")) blocks.push(`<h3>${inlineMarkdown(line.slice(3))}</h3>`);
    else if (line.startsWith("# ")) blocks.push(`<h2>${inlineMarkdown(line.slice(2))}</h2>`);
    else if (line.startsWith("> "))
      blocks.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    else blocks.push(`<p>${inlineMarkdown(line) || "<br>"}</p>`);
  }
  closeList();
  return blocks.join("");
}

function inlineHtml(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const content = Array.from(node.childNodes, inlineHtml).join("");
  if (node.tagName === "STRONG" || node.tagName === "B") return `**${content}**`;
  if (node.tagName === "EM" || node.tagName === "I") return `*${content}*`;
  if (node.tagName === "CODE") return `\`${content}\``;
  if (node.tagName === "BR") return "\n";
  if (node.tagName === "INPUT") return "";
  return content;
}

export function notesHtmlToMarkdown(editor: HTMLElement): string {
  const lines: string[] = [];
  for (const node of editor.children) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.tagName === "UL") {
      for (const item of node.children) {
        if (!(item instanceof HTMLElement)) continue;
        const checkbox = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
        const prefix = checkbox ? `- [${checkbox.checked ? "x" : ""}] ` : "- ";
        lines.push(`${prefix}${inlineHtml(item).trim()}`);
      }
      continue;
    }
    const prefix =
      node.tagName === "H2"
        ? "# "
        : node.tagName === "H3"
          ? "## "
          : node.tagName === "BLOCKQUOTE"
            ? "> "
            : "";
    lines.push(`${prefix}${inlineHtml(node)}`);
  }
  return lines
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trimEnd();
}
