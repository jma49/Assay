const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * Turns **bold**, *italic*, ***both*** and ~~strike~~ into HTML. The text is
 * escaped first: it comes from AI output that echoes user-written SQL, so any
 * markup in it must render as text, never as HTML.
 */
export function formatInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/~~(.*?)~~/g, '<del class="line-through opacity-75">$1</del>');
}
