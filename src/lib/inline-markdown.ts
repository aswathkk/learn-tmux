/**
 * Inline markdown for the short strings that live in frontmatter.
 *
 * Hints and objectives are written with backticks and the odd bold run, but
 * they are frontmatter values, so the markdown pipeline never sees them. This
 * renders exactly the inline subset those fields use and nothing else.
 *
 * It escapes first and only then introduces markup, so a lesson can mention a
 * literal < or & without it becoming a tag.
 */
const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character]);
}

/**
 * `code`, **bold**, _em_ and [text](href).
 *
 * Links are restricted to http(s) and site-relative targets: these strings are
 * authored in-repo, but the rule keeps a javascript: URL from ever being one
 * edit away.
 */
export function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (_match, label, href) => {
      const external = href.startsWith('http');
      const attributes = external ? ' rel="noopener" target="_blank"' : '';
      return `<a href="${href}"${attributes}>${label}</a>`;
    });
}
