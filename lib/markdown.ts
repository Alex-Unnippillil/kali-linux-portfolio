export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export async function renderMarkdown(md: string): Promise<{ html: string; toc: TocItem[] }> {
  const { marked } = await import('marked');
  const toc: TocItem[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = (text, level, raw, slugger) => {
    const id = slugger.slug(raw);
    toc.push({ id, text: raw, level });
    return `<h${level} id="${id}" class="group"><span>${text}</span><a href="#${id}" class="ml-2 opacity-0 group-hover:opacity-100 inline-block">🔗</a></h${level}>`;
  };
  const html = marked(md, { renderer });
  return { html, toc };
}
