class Slugger {
  private seen: Record<string, number> = {};

  slug(value: string): string {
    const base =
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section';
    const count = this.seen[base] ?? 0;
    this.seen[base] = count + 1;
    return count === 0 ? base : `${base}-${count}`;
  }
}

class Renderer {
  heading(text: string, level: number) {
    return `<h${level}>${text}</h${level}>`;
  }
}

const lexer = (markdown: string) => {
  const tokens: Array<{ type: string; depth?: number; text?: string }> = [];
  markdown.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return;
    if (line.startsWith('## ')) {
      tokens.push({ type: 'heading', depth: 2, text: line.slice(3) });
    } else if (line.startsWith('# ')) {
      tokens.push({ type: 'heading', depth: 1, text: line.slice(2) });
    } else {
      tokens.push({ type: 'paragraph', text: line.trim() });
    }
  });
  return tokens;
};

const parse = (markdown: string, options?: { renderer?: Renderer }) => {
  const tokens = lexer(markdown);
  const renderer = options?.renderer ?? new Renderer();
  return tokens
    .map((token) => {
      if (token.type === 'heading') {
        return renderer.heading(token.text ?? '', token.depth ?? 1);
      }
      return `<p>${token.text ?? ''}</p>`;
    })
    .join('');
};

export const marked = {
  lexer,
  parse,
  Slugger,
  Renderer,
};

export default marked;
