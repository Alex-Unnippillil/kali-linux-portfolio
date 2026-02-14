"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { useRouter } from 'next/router';
import type { ModuleMetadata } from '../modules/metadata';
import { loadMarked } from '../lib/loadMarked';

interface HeadingLink {
  id: string;
  text: string;
  level: number;
}

interface ModuleReadmeProps {
  module: ModuleMetadata;
}

const sanitizeText = (value: string) =>
  DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

export default function ModuleReadme({ module }: ModuleReadmeProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [rendered, setRendered] = useState<{
    html: string;
    headings: HeadingLink[];
  }>({ html: '', headings: [] });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    setRendered({ html: '', headings: [] });

    const load = async () => {
      try {
        const response = await fetch(module.docPath);
        if (!response.ok) {
          throw new Error('Failed to load documentation');
        }
        const markdown = await response.text();
        if (cancelled) return;
        if (!markdown.trim()) {
          throw new Error('Empty documentation');
        }

        const { marked } = await loadMarked();
        if (cancelled) return;

        const collected: HeadingLink[] = [];
        const slugCounts = new Map<string, number>();
        const renderer = new marked.Renderer();
        const createSlug = (value: string) => {
          const base = sanitizeText(value)
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
          const candidate = base || `section-${collected.length}`;
          const count = slugCounts.get(candidate) ?? 0;
          slugCounts.set(candidate, count + 1);
          return count > 0 ? `${candidate}-${count}` : candidate;
        };

        renderer.heading = (text, level, raw) => {
          const slug = createSlug(raw);
          collected.push({
            id: slug,
            text: sanitizeText(text),
            level,
          });
          return `<h${level} id="${slug}">${text}</h${level}>`;
        };

        const renderedHtml = marked.parse(markdown, { renderer }) as string;
        const safeHtml = DOMPurify.sanitize(renderedHtml, {
          USE_PROFILES: { html: true },
        });

        if (cancelled) return;
        setRendered({ html: safeHtml, headings: collected });
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError('Unable to load documentation for this module.');
        setStatus('error');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [module.docPath]);

  const html = rendered.html;
  const headings = rendered.headings;

  const currentHash = useMemo(() => {
    const [, hash] = router.asPath.split('#');
    return hash || '';
  }, [router.asPath]);

  useEffect(() => {
    if (!html) return;
    const [, hash] = router.asPath.split('#');
    if (!hash) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      return;
    }
    const target = document.getElementById(hash);
    target?.scrollIntoView({ block: 'start' });
  }, [html, router.asPath]);

  const handleAnchorClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      const nextQuery = { ...router.query, module: module.name };
      router.push(
        {
          pathname: router.pathname,
          query: nextQuery,
          hash: id,
        },
        undefined,
        { shallow: true, scroll: false }
      );
    },
    [module.name, router]
  );

  return (
    <div className="flex flex-col gap-4">
      {headings.length > 0 && (
        <nav
          aria-label={`${module.name} README sections`}
          className="flex flex-wrap gap-2"
        >
          {headings
            .filter((heading) => heading.level <= 3)
            .map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                onClick={(event) => handleAnchorClick(event, heading.id)}
                className={`rounded border px-2 py-1 text-sm transition-colors hover:bg-gray-100 focus:outline-none focus:ring ${
                  currentHash === heading.id ? 'bg-gray-200 font-semibold' : ''
                }`}
              >
                {heading.text}
              </a>
            ))}
        </nav>
      )}

      <div
        ref={scrollContainerRef}
        className="prose max-w-none overflow-y-auto rounded border p-3"
      >
        {status === 'loading' && <p>Loading documentation…</p>}
        {status === 'error' && (
          <p role="alert">{error ?? 'Documentation unavailable.'}</p>
        )}
        {status === 'ready' && (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
