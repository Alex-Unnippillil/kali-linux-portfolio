import fs from 'fs';
import path from 'path';
import React from 'react';
import { marked } from 'marked';
import TOC from '../../components/TOC';

interface Heading {
  id: string;
  text: string;
}

interface Props {
  html: string;
  headings: Heading[];
}

const GettingStarted = ({ html, headings }: Props) => (
  <div className="flex gap-4">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-white text-black p-2 z-50"
    >
      Skip to main content
    </a>
    <TOC headings={headings} />
    <main
      id="main-content"
      className="prose dark:prose-invert max-w-none flex-1 p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  </div>
);

export async function getStaticProps() {
  const filePath = path.join(process.cwd(), 'docs', 'getting-started.md');
  const markdown = fs.readFileSync(filePath, 'utf-8');
  const slugger = new marked.Slugger();
  const tokens = marked.lexer(markdown);
  const headings: Heading[] = tokens
    .filter((t) => t.type === 'heading' && t.depth <= 3)
    .map((t) => ({ id: slugger.slug(t.text), text: t.text }));

  const renderer = new marked.Renderer();
  renderer.heading = (text, level, raw) => {
    const id = slugger.slug(raw);
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  const html = marked(markdown, { renderer });

  return { props: { html, headings } };
}

export default GettingStarted;

