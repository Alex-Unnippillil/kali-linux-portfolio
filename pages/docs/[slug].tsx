import fs from 'fs';
import path from 'path';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useEffect, useState } from 'react';
import { renderMarkdown, TocItem } from '../../lib/markdown';

interface DocProps {
  html: string;
  toc: TocItem[];
}

export default function DocPage({ html, toc }: DocProps) {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const first = document.querySelector('h2');
    const handler = () => {
      if (!first) return;
      setShowTop(window.scrollY > (first as HTMLElement).offsetTop);
    };
    window.addEventListener('scroll', handler);
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return (
    <div className="prose mx-auto p-4">
      <a id="top" />
      {toc.length > 2 && (
        <nav className="mb-4">
          <strong>Table of Contents</strong>
          <ul>
            {toc.map((t) => (
              <li key={t.id} style={{ marginLeft: (t.level - 2) * 16 }}>
                <a href={`#${t.id}`}>{t.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {showTop && (
        <button
          className="fixed bottom-4 right-4 px-3 py-2 bg-gray-800 text-white rounded"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Back to top
        </button>
      )}
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = path.join(process.cwd(), 'docs');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  return {
    paths: files.map((f) => ({ params: { slug: f.replace(/\.md$/, '') } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<DocProps> = async ({ params }) => {
  const slug = params?.slug as string;
  const file = fs.readFileSync(path.join(process.cwd(), 'docs', `${slug}.md`), 'utf8');
  const { html, toc } = await renderMarkdown(file);
  return { props: { html, toc } };
};
