import { renderMarkdown } from '../lib/markdown';

jest.mock('marked', () => {
  const markedFn = (md: string, opts: any) => {
    const renderer = opts.renderer;
    const slugger = { slug: (str: string) => str.toLowerCase().replace(/\s+/g, '-') };
    return md.replace(/^## (.+)$/gm, (_: string, title: string) =>
      renderer.heading(title, 2, title, slugger),
    );
  };
  markedFn.Renderer = class {
    heading(text: string) {
      return `<h2>${text}</h2>`;
    }
  };
  return { marked: markedFn };
});

describe('renderMarkdown', () => {
  it('generates anchors and toc entries', async () => {
    const md = '# Title\n\n## Section One\nContent';
    const { html, toc } = await renderMarkdown(md);
    expect(toc).toEqual([{ id: 'section-one', text: 'Section One', level: 2 }]);
    expect(html).toContain('id="section-one"');
    expect(html).toContain('href="#section-one"');
  });
});
