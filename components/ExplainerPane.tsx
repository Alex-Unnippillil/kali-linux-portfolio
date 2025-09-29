import { useCallback, useMemo, useRef } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import GithubSlugger from 'github-slugger';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { toString } from 'mdast-util-to-string';
import type { Heading, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { Schema } from 'hast-util-sanitize';

interface Resource {
  label: string;
  url: string;
}

interface Props {
  lines: string[];
  resources: Resource[];
}

interface TocItem {
  id: string;
  title: string;
  depth: 2 | 3;
}

const HEADING_LEVELS = new Set<Heading['depth']>([2, 3]);

const SANITIZE_SCHEMA: Schema = (() => {
  const attributes = { ...(defaultSchema.attributes ?? {}) } as Schema['attributes'];

  const anchorAttributes = attributes?.a ?? [];
  attributes!.a = [
    ...anchorAttributes,
    ['className'],
    ['rel'],
    ['target'],
    ['title'],
    ['aria-label'],
  ];

  (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).forEach((tag) => {
    const existing = attributes?.[tag] ?? [];
    attributes![tag] = [...existing, ['id'], ['className']];
  });

  return {
    ...defaultSchema,
    clobberPrefix: '',
    attributes,
  } as Schema;
})();

export default function ExplainerPane({ lines, resources }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const tocRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const markdown = useMemo(() => lines.join('\n\n'), [lines]);

  const { html, toc } = useMemo(() => {
    if (!markdown.trim()) {
      return { html: '', toc: [] as TocItem[] };
    }

    const parser = unified().use(remarkParse);
    const tree = parser.parse(markdown) as Root;

    const slugger = new GithubSlugger();
    const items: TocItem[] = [];

    visit(tree, 'heading', (node) => {
      const heading = node as Heading;
      const title = toString(heading).trim();

      if (!title) {
        return;
      }

      const id = slugger.slug(title);

      heading.data = heading.data ?? {};
      heading.data.hProperties = {
        ...(heading.data.hProperties as Record<string, unknown> | undefined),
        id,
      };

      if (HEADING_LEVELS.has(heading.depth)) {
        items.push({ id, title, depth: heading.depth as 2 | 3 });
      }
    });

    const processor = unified()
      .use(remarkRehype)
      .use(rehypeSanitize, SANITIZE_SCHEMA)
      .use(rehypeStringify);

    const file = processor.processSync(tree);

    return { html: String(file), toc: items };
  }, [markdown]);

  tocRefs.current.length = toc.length;

  const scrollToHeading = useCallback((id: string) => {
    if (!contentRef.current) {
      return;
    }

    const target = contentRef.current.querySelector<HTMLElement>(`#${id}`);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      target.setAttribute('tabindex', '-1');

      target.focus({ preventScroll: true });

      const removeTabIndex = () => {
        target.removeAttribute('tabindex');
      };

      target.addEventListener('blur', removeTabIndex, { once: true });
    }
  }, []);

  const handleTocActivate = useCallback(
    (event: MouseEvent<HTMLAnchorElement> | KeyboardEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      scrollToHeading(id);
    },
    [scrollToHeading],
  );

  const handleTocKeyDown = useCallback(
    (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
      }

      const focusItem = (nextIndex: number) => {
        const next = tocRefs.current[nextIndex];
        if (next) {
          next.focus();
        }
      };

      if (event.key === 'ArrowDown') {
        focusItem(Math.min(tocRefs.current.length - 1, index + 1));
      } else if (event.key === 'ArrowUp') {
        focusItem(Math.max(0, index - 1));
      } else if (event.key === 'Home') {
        focusItem(0);
      } else if (event.key === 'End') {
        focusItem(tocRefs.current.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        handleTocActivate(event, toc[index].id);
      }
    },
    [handleTocActivate, toc],
  );

  return (
    <aside
      className="text-xs p-2 border-l border-ub-cool-grey overflow-auto h-full scroll-smooth flex flex-col gap-4"
      aria-label="explainer pane"
    >
      {toc.length > 0 && (
        <nav aria-label="Table of contents" className="sticky top-0 bg-ub-dark-900/80 backdrop-blur-sm pt-2">
          <h3 className="font-bold mb-2 text-sm">On this page</h3>
          <ul className="space-y-1">
            {toc.map((item, index) => (
              <li key={item.id} className={item.depth === 3 ? 'pl-4' : undefined}>
                <a
                  href={`#${item.id}`}
                  ref={(element) => {
                    tocRefs.current[index] = element;
                  }}
                  onClick={(event) => handleTocActivate(event, item.id)}
                  onKeyDown={(event) => handleTocKeyDown(event, index)}
                  className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div ref={contentRef} className="space-y-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />

      {resources.length > 0 && (
        <div>
          <h3 className="font-bold mb-2 text-sm">Learn More</h3>
          <ul className="list-disc list-inside space-y-1">
            {resources.map((resource) => (
              <li key={resource.url}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {resource.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

