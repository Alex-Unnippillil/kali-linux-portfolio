import { isBrowser } from '@/utils/env';
import fs from 'fs';
import path from 'path';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { marked } from 'marked';
import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

interface DocProps {
  html: string;
  toc: TocItem[];
  title: string;
  topic: string;
}

export default function DocPage({ html, toc, title, topic }: DocProps) {
  useEffect(() => {
    if (isBrowser() && window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      el?.scrollIntoView();
    }
  }, []);

  interface TocSection {
    id: string;
    text: string;
    children: TocItem[];
  }

  const sections: TocSection[] = toc.reduce((acc: TocSection[], item) => {
    if (item.depth === 2) {
      acc.push({ id: item.id, text: item.text, children: [] });
    } else if (item.depth === 3 && acc.length > 0) {
      acc[acc.length - 1].children.push(item);
    }
    return acc;
  }, []);

  const [openSections, setOpenSections] = useState<string[]>([]);
  const [showToc, setShowToc] = useState(false);

  useEffect(() => {
    if (!isBrowser()) return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      setOpenSections(sections.map((s) => s.id));
      setShowToc(true);
    }
  }, [sections]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: siteUrl,
              name: 'Kali Linux Portfolio',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Docs',
                  item: `${siteUrl}/docs`,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: title,
                  item: `${siteUrl}/docs/${topic}`,
                },
              ],
            }),
          }}
        />
      </Head>
      <div className="flex flex-col md:flex-row p-4">
        <nav className="md:w-1/4 md:pr-4 md:sticky md:top-0">
          <button
            className="md:hidden mb-2 flex items-center"
            onClick={() => setShowToc((v) => !v)}
            aria-label="Toggle table of contents"
          >
            Table of Contents {showToc ? '▲' : '▼'}
          </button>
          <div className={`${showToc ? '' : 'hidden'} md:block`}> 
            {sections.map((section) => (
              <div key={section.id} className="mb-2">
                <div className="flex items-center text-sm font-medium">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="mr-1"
                    aria-label={`Toggle ${section.text}`}
                  >
                    {openSections.includes(section.id) ? '▼' : '▶'}
                  </button>
                  <a href={`#${section.id}`}>{section.text}</a>
                </div>
                {section.children.length > 0 && openSections.includes(section.id) && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {section.children.map((child) => (
                      <li key={child.id}>
                        <a href={`#${child.id}`} className="text-sm">
                          {child.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </nav>
        <article className="prose flex-1" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
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

  const titleToken = tokens.find(
    (t) => t.type === 'heading' && (t as any).depth === 1,
  ) as any;
  const title = titleToken ? titleToken.text : topic;

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
  return { props: { html, toc, title, topic } };
};
