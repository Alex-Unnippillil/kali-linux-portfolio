import { isBrowser } from '@/utils/env';
import fs from 'fs';
import path from 'path';
import { GetStaticPaths, GetStaticProps } from 'next';
import { useEffect } from 'react';
import TableOfContents from '@/components/ui/TableOfContents';
import { mdxToHtmlWithToc, TocItem } from '@/utils/mdx';

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
      <TableOfContents headings={toc} className="md:w-1/4 md:pr-4" />
      <article
        className="prose flex-1 md:pl-8"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const dir = path.join(process.cwd(), 'public', 'docs', 'seed');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  return {
    paths: files.map((name) => ({ params: { topic: name.replace(/\.mdx?$/, '') } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<DocProps> = async ({ params }) => {
  const topic = params?.topic as string;
  const mdPath = path.join(process.cwd(), 'public', 'docs', 'seed', `${topic}.md`);
  const mdxPath = path.join(process.cwd(), 'public', 'docs', 'seed', `${topic}.mdx`);
  const filePath = fs.existsSync(mdxPath) ? mdxPath : mdPath;
  const source = fs.readFileSync(filePath, 'utf8');
  const { html, toc } = await mdxToHtmlWithToc(source);
  return { props: { html, toc } };
};
