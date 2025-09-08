export interface Heading {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string, counts: Record<string, number>) {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  const count = counts[base] || 0;
  counts[base] = count + 1;
  return count ? `${base}-${count}` : base;
}

/**
 * Very small markdown renderer that supports headings and paragraphs and
 * injects id anchors on headings so a table of contents can link to them.
 */
export function renderMarkdown(markdown: string): { html: string; headings: Heading[] } {
  const lines = markdown.split(/\n+/);
  const headings: Heading[] = [];
  const html: string[] = [];
  const counts: Record<string, number> = {};

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slugify(text, counts);
      headings.push({ id, text, level });
      html.push(`<h${level} id="${id}">${text}</h${level}>`);
    } else if (line.trim() !== '') {
      html.push(`<p>${line}</p>`);
    }
  }

  return { html: html.join('\n'), headings };
}
