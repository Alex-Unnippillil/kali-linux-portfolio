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
  githubUrl: string;
}

export default function DocPage({ html, toc, githubUrl }: DocProps) {
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
      <div className="flex-1">
        <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="mt-8">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            View on GitHub
          </a>
        </div>
      </div>
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

  const tocSlugger = new marked.Slugger();
  const toc: TocItem[] = tokens
    .filter((t) => t.type === 'heading' && (t as any).depth && ((t as any).depth === 2 || (t as any).depth === 3))
    .map((t) => ({
      id: tocSlugger.slug((t as any).text),
      text: (t as any).text,
      depth: (t as any).depth,
    }));

  const renderer = new marked.Renderer();
  const renderSlugger = new marked.Slugger();
  renderer.heading = (text, level) => {
    const id = renderSlugger.slug(text);
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  const html = marked.parse(md, { renderer }) as string;

  const relativePath = path.posix.join('public', 'docs', 'seed', `${topic}.md`);
  const githubUrl = `https://github.com/unnippillil/kali-linux-portfolio/blob/main/${relativePath}`;

  return { props: { html, toc, githubUrl } };
};
