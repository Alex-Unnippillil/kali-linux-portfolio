import { marked } from 'marked';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export async function mdxToHtmlWithToc(source: string): Promise<{ html: string; toc: TocItem[] }> {
  const toc: TocItem[] = [];
  const slugger = new (marked as any).Slugger();

  const processor = remark()
    .use(remarkMdx)
    .use(() => (tree: any) => {
      visit(tree, 'heading', (node: any) => {
        const text = toString(node);
        const id = slugger.slug(text);
        toc.push({ id, text, depth: node.depth });
        node.data = node.data || {};
        node.data.hProperties = node.data.hProperties || {};
        node.data.hProperties.id = id;
      });
    })
    .use(remarkRehype)
    .use(rehypeStringify);

  const file = await processor.process(source);
  return { html: String(file), toc };
}

