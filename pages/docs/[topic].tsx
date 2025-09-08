import { isBrowser } from '@/utils/env';
import fs from 'fs';
import path from 'path';
import { GetStaticPaths, GetStaticProps } from 'next';
import { marked } from 'marked';
import { useEffect } from 'react';

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

interface DocProps {
  html: string;
  toc: TocItem[];
}

export default function DocPage({ html, toc }: DocProps) {
  useEffect(() => {
    if (isBrowser() && window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      el?.scrollIntoView();
    }
  }, []);

  return (
    <div className="flex flex-col md:flex-row p-4">
      <nav className="md:w-1/4 md:pr-4">
        <ul>
          {toc.map(({ id, text, depth }) => (
            <li key={id} className={depth === 3 ? 'ml-4' : ''}>
              <a href={`#${id}`}>{text}</a>
            </li>
          ))}
        </ul>
      </nav>
      <article className="prose flex-1" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = path.join(process.cwd(), 'public', 'docs', 'seed');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  return {
    paths: files.map((name) => ({ params: { topic: name.replace(/\.md$/, '') } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<DocProps> = async ({ params }) => {
  const topic = params?.topic as string;
  const filePath = path.join(process.cwd(), 'public', 'docs', 'seed', `${topic}.md`);
  const md = fs.readFileSync(filePath, 'utf8');
  const tokens = marked.lexer(md);

  const { Slugger, Renderer } = marked as any;
  const tocSlugger = new Slugger();
  const toc: TocItem[] = tokens
    .filter((t) => t.type === 'heading' && (t as any).depth && ((t as any).depth === 2 || (t as any).depth === 3))
    .map((t) => ({
      id: tocSlugger.slug((t as any).text),
      text: (t as any).text,
      depth: (t as any).depth,
    }));

  const renderer = new Renderer();
  const renderSlugger = new Slugger();
  (renderer.heading as any) = (text: string, level: number) => {
    const id = renderSlugger.slug(text);
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  const html = marked.parse(md, { renderer }) as string;
  return { props: { html, toc } };
};
