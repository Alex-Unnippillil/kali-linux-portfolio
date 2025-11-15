import React, { useMemo } from 'react';
import type { ReactNode } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFootnotes from 'remark-footnotes';
import remarkRehype from 'remark-rehype';
import rehypeReact from 'rehype-react';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import Footnotes from './Footnotes';
import remarkFootnotesToElements, { footnoteHandlers } from '../../lib/content/remarkFootnotes';

export interface MarkdownContentProps {
  source: string;
  className?: string;
  components?: Record<string, React.ComponentType<any>>;
}

const cloneSanitizeSchema = () => {
  const schema = JSON.parse(JSON.stringify(defaultSchema));
  schema.tagNames = Array.from(new Set([...(schema.tagNames ?? []), 'footnotes', 'footnote-item']));
  schema.attributes = {
    ...(schema.attributes ?? {}),
    footnotes: [...(schema.attributes?.footnotes ?? []), 'aria-label'],
    'footnote-item': [
      ...(schema.attributes?.['footnote-item'] ?? []),
      'data-footnote-id',
      'data-footnote-label',
      'data-reference-ids',
    ],
    sup: [...new Set([...(schema.attributes?.sup ?? []), 'id', 'data-footnote-ref', 'className'])],
    a: [...new Set([...(schema.attributes?.a ?? []), 'aria-label', 'role', 'data-footnote-ref'])],
  };
  return schema;
};

const MarkdownContent = ({ source, className, components }: MarkdownContentProps) => {
  const componentMap = useMemo(
    () => ({
      footnotes: Footnotes,
      'footnote-item': Footnotes.Item,
      ...(components ?? {}),
    }),
    [components],
  );

  const processor = useMemo(
    () =>
      unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkFootnotes, { inlineNotes: true })
        .use(remarkFootnotesToElements)
        .use(remarkRehype, {
          allowDangerousHtml: false,
          handlers: footnoteHandlers,
        })
        .use(rehypeSanitize, cloneSanitizeSchema())
        .use(
          rehypeReact,
          {
            createElement: React.createElement,
            Fragment: React.Fragment,
            components: componentMap,
          },
        ),
    [componentMap],
  );

  const rendered = useMemo(() => {
    try {
      const file = processor.processSync(source);
      return file.result as ReactNode;
    } catch (error) {
      console.error('Failed to render markdown content', error);
      return <p>Unable to render content.</p>;
    }
  }, [processor, source]);

  const wrapperClass = className
    ? `prose prose-slate max-w-none dark:prose-invert ${className}`
    : 'prose prose-slate max-w-none dark:prose-invert';

  return <div className={wrapperClass}>{rendered}</div>;
};

export default MarkdownContent;
