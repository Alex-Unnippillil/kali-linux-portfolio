import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';

import type { TocEntry } from '@/lib/mdx/plugins';

const DEFAULT_TITLE = 'On this page';

const decodeHash = (hash: string): string => {
  if (!hash) return '';
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch (error) {
    return hash.replace(/^#/, '');
  }
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

interface ScrollOptions {
  smooth?: boolean;
  updateUrl?: boolean;
}

export interface TableOfContentsProps {
  headings: TocEntry[];
  title?: string;
  className?: string;
  initiallyOpen?: boolean;
}

const focusHeading = (element: HTMLElement) => {
  if (element.tabIndex < 0) {
    element.tabIndex = -1;
  }
  requestAnimationFrame(() => {
    element.focus({ preventScroll: true });
  });
};

const computeBaseDepth = (headings: TocEntry[]): number => {
  return headings.reduce((min, heading) => Math.min(min, heading.depth), Number.POSITIVE_INFINITY);
};

export const TableOfContents = ({
  headings,
  title = DEFAULT_TITLE,
  className,
  initiallyOpen = false,
}: TableOfContentsProps) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [activeId, setActiveId] = useState<string>('');
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const baseDepth = useMemo(() => {
    const computed = computeBaseDepth(headings);
    return Number.isFinite(computed) ? computed : 0;
  }, [headings]);

  const scrollAndFocus = useCallback(
    (id: string, options: ScrollOptions = {}) => {
      if (typeof window === 'undefined' || !id) {
        return;
      }

      const element = document.getElementById(id);
      if (!element) {
        return;
      }

      const smooth = options.smooth ?? true;
      const behavior: ScrollBehavior = prefersReducedMotion() || !smooth ? 'auto' : 'smooth';
      element.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });

      if (element instanceof HTMLElement) {
        focusHeading(element);
      }

      if (options.updateUrl ?? true) {
        const nextHash = `#${id}`;
        const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
        if (window.location.hash !== nextHash) {
          history.pushState(null, '', nextUrl);
        }
      }

      if (activeIdRef.current !== id) {
        setActiveId(id);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || headings.length === 0) {
      return;
    }

    const hash = decodeHash(window.location.hash);
    if (!hash) {
      return;
    }

    const timer = window.setTimeout(() => {
      scrollAndFocus(hash, { smooth: false, updateUrl: false });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [headings, scrollAndFocus]);

  useEffect(() => {
    if (typeof window === 'undefined' || headings.length === 0) {
      return;
    }

    const handleHashChange = () => {
      const hash = decodeHash(window.location.hash);
      if (!hash) {
        return;
      }
      scrollAndFocus(hash, { smooth: false, updateUrl: false });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [headings, scrollAndFocus]);

  useEffect(() => {
    if (typeof window === 'undefined' || headings.length === 0) {
      return;
    }

    const elements = headings
      .map((entry) => document.getElementById(entry.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);

        if (visible.length > 0) {
          const topMost = visible[0]?.target.id;
          if (topMost && topMost !== activeIdRef.current) {
            setActiveId(topMost);
          }
          return;
        }

        const nearest = elements
          .slice()
          .sort((a, b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top))[0];

        if (nearest && nearest.id !== activeIdRef.current) {
          setActiveId(nearest.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75] },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [headings]);

  const handleItemClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      scrollAndFocus(id, { smooth: true, updateUrl: true });
      setIsOpen(false);
    },
    [scrollAndFocus],
  );

  const renderList = (variant: 'mobile' | 'desktop') => (
    <ol className={clsx('space-y-1', variant === 'desktop' ? 'text-sm' : 'text-base')}>
      {headings.map((heading) => {
        const depthOffset = Math.max(0, heading.depth - baseDepth);
        const isActive = heading.id === activeId;
        return (
          <li key={heading.id} style={{ paddingLeft: depthOffset * 12 }}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => handleItemClick(event, heading.id)}
              className={clsx(
                'block rounded-md px-3 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500',
                isActive
                  ? 'bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-300'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80',
              )}
            >
              {heading.value}
            </a>
          </li>
        );
      })}
    </ol>
  );

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className={clsx('space-y-6', className)}>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          <span>{title}</span>
          <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen ? <div className="border-t border-slate-200 px-2 pb-3 pt-2 dark:border-slate-700">{renderList('mobile')}</div> : null}
      </div>

      <nav
        className="sticky top-24 hidden max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 md:block"
        aria-label={title}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
        {renderList('desktop')}
      </nav>
    </div>
  );
};

export default TableOfContents;
