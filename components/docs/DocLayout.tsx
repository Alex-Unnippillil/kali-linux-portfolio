import { useMemo, useRef } from 'react';
import Link from 'next/link';

export interface DocFrontmatter {
  title: string;
  description?: string;
  updated?: string;
}

export interface DocNavItem {
  title: string;
  href: string;
  slug: string[];
  group: string;
  isActive: boolean;
  order?: number;
}

export interface DocNavGroup {
  label: string;
  items: DocNavItem[];
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  depth: number;
}

export interface DocLayoutProps {
  frontmatter: DocFrontmatter;
  navGroups: DocNavGroup[];
  toc: TableOfContentsItem[];
  children: React.ReactNode;
}

type FocusableElement = HTMLAnchorElement | HTMLButtonElement;

type RovingListKey = 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

function isRovingKey(value: string): value is RovingListKey {
  return (
    value === 'ArrowDown' ||
    value === 'ArrowUp' ||
    value === 'ArrowLeft' ||
    value === 'ArrowRight' ||
    value === 'Home' ||
    value === 'End'
  );
}

function handleRovingKey(
  event: React.KeyboardEvent<FocusableElement>,
  refs: React.MutableRefObject<Array<FocusableElement | null>>,
  index: number,
) {
  if (!isRovingKey(event.key)) {
    return;
  }

  const items = refs.current.filter(Boolean);
  if (items.length === 0) {
    return;
  }

  const firstIndex = 0;
  const lastIndex = items.length - 1;

  if (event.key === 'Home') {
    event.preventDefault();
    items[firstIndex]?.focus();
    return;
  }

  if (event.key === 'End') {
    event.preventDefault();
    items[lastIndex]?.focus();
    return;
  }

  const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
  const flattenedIndex = Math.max(0, Math.min(refs.current.length - 1, index));
  const nextIndex = (() => {
    const proposed = flattenedIndex + delta;
    if (proposed < firstIndex) return lastIndex;
    if (proposed > lastIndex) return firstIndex;
    return proposed;
  })();

  const target = items[nextIndex];
  if (target) {
    event.preventDefault();
    target.focus();
  }
}

function formatUpdatedAt(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(parsed);
  } catch (error) {
    return value;
  }
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function DocLayout({ frontmatter, navGroups, toc, children }: DocLayoutProps) {
  const navRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const tocRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const navItemCount = useMemo(
    () => navGroups.reduce((total, group) => total + group.items.length, 0),
    [navGroups],
  );
  const tocItemCount = toc.length;

  if (navRefs.current.length !== navItemCount) {
    const existing = navRefs.current;
    navRefs.current = Array.from({ length: navItemCount }, (_, index) => existing[index] ?? null);
  }

  if (tocRefs.current.length !== tocItemCount) {
    const existing = tocRefs.current;
    tocRefs.current = Array.from({ length: tocItemCount }, (_, index) => existing[index] ?? null);
  }

  const updatedLabel = formatUpdatedAt(frontmatter.updated);
  let navIndex = -1;

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-10 lg:flex-row lg:px-8">
        <aside className="lg:w-72" aria-label="Documentation navigation">
          <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Docs navigation</p>
            <nav className="mt-4 space-y-6" aria-label="Documentation topics">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-sm font-semibold text-slate-300">{group.label}</p>
                  <ul className="mt-2 space-y-1">
                    {group.items.map((item) => {
                      navIndex += 1;
                      const index = navIndex;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onKeyDown={(event) => handleRovingKey(event, navRefs, index)}
                            ref={(element) => {
                              navRefs.current[index] = element;
                            }}
                            className={classNames(
                              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                              item.isActive
                                ? 'bg-sky-500/20 text-sky-200'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                            )}
                            aria-current={item.isActive ? 'page' : undefined}
                          >
                            {item.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-8 space-y-3 border-b border-slate-800 pb-6">
            <p className="text-xs uppercase tracking-wide text-slate-400">Documentation</p>
            <h1 className="text-3xl font-semibold text-white lg:text-4xl">{frontmatter.title}</h1>
            {frontmatter.description ? (
              <p className="max-w-2xl text-base text-slate-300">{frontmatter.description}</p>
            ) : null}
            {updatedLabel ? (
              <p className="text-xs text-slate-500">Last updated {updatedLabel}</p>
            ) : null}
          </header>
          <article className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-a:text-sky-300">
            {children}
          </article>
        </main>

        {toc.length > 0 ? (
          <aside className="hidden w-64 shrink-0 lg:block" aria-label="On this page">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">On this page</p>
              <nav className="mt-3" aria-label="Table of contents">
                <ul className="space-y-1">
                  {toc.map((item, index) => (
                    <li key={item.id} className={classNames(item.depth > 2 && 'pl-4')}>
                      <a
                        href={`#${item.id}`}
                        onKeyDown={(event) => handleRovingKey(event, tocRefs, index)}
                        ref={(element) => {
                          tocRefs.current[index] = element;
                        }}
                        className="block rounded-md px-2 py-1 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default DocLayout;
