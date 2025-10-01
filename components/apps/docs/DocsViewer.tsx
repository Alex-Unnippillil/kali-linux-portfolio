'use client';

import React, {
  AnchorHTMLAttributes,
  PropsWithChildren,
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { TokensList } from 'marked';
import DOMPurify from 'dompurify';
import usePersistentState from '../../../hooks/usePersistentState';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface DocSection {
  id: string;
  text: string;
}

interface LayoutState {
  docked: boolean;
  width: number;
}

interface OpenDocOptions {
  appId: string;
  docPath?: string;
  fallback?: string;
}

interface DocsViewerContextValue {
  openDoc: (options: OpenDocOptions) => void;
  closeDoc: () => void;
  isOpen: boolean;
  currentDoc: string | null;
  currentApp: string | null;
  toggleDock: () => void;
}

interface DocsLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  appId: string;
  docPath: string;
  fallbackDoc?: string;
}

const DEFAULT_LAYOUT: LayoutState = {
  docked: true,
  width: 420,
};

const DocsViewerContext = createContext<DocsViewerContextValue | undefined>(
  undefined,
);

const isRecordOfStrings = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
};

const isLayoutState = (value: unknown): value is LayoutState => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as LayoutState;
  return typeof candidate.docked === 'boolean' && typeof candidate.width === 'number';
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapeSelector = (id: string) => {
  if (typeof window !== 'undefined' && window.CSS?.escape) {
    return window.CSS.escape(id);
  }
  return id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~\s])/g, '\\$1');
};

const normalizeText = (value: string) =>
  value
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/>\s*/g, '')
    .replace(/#+\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const clampWidth = (width: number) => Math.min(Math.max(width, 320), 720);

const buildSections = (tokens: TokensList, headings: Heading[]): DocSection[] => {
  if (headings.length === 0) {
    const combined = tokens
      .map((token) => {
        if ('text' in token && typeof token.text === 'string') {
          return normalizeText(token.text);
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');
    return combined ? [{ id: 'top', text: combined }] : [];
  }

  const sectionsMap = new Map<string, string>();
  let headingIndex = -1;
  let currentId = headings[0]?.id ?? 'top';

  const appendText = (id: string, text: string) => {
    if (!text) return;
    const existing = sectionsMap.get(id) ?? '';
    sectionsMap.set(id, `${existing}${existing ? ' ' : ''}${text}`.trim());
  };

  tokens.forEach((token) => {
    if (token.type === 'heading') {
      headingIndex += 1;
      currentId = headings[headingIndex]?.id ?? currentId;
      if (!sectionsMap.has(currentId)) sectionsMap.set(currentId, '');
    } else if (token.type === 'paragraph') {
      const targetId = headingIndex >= 0 ? currentId : headings[0].id;
      appendText(targetId, normalizeText(token.text ?? ''));
    } else if (token.type === 'list') {
      const targetId = headingIndex >= 0 ? currentId : headings[0].id;
      token.items?.forEach((item) => {
        appendText(targetId, normalizeText(item.text ?? ''));
      });
    } else if (token.type === 'code') {
      const targetId = headingIndex >= 0 ? currentId : headings[0].id;
      appendText(targetId, normalizeText(token.text ?? ''));
    }
  });

  return headings.map((heading) => ({
    id: heading.id,
    text: sectionsMap.get(heading.id) ?? '',
  }));
};

const highlightSnippet = (snippet: string, query: string): ReactNode[] => {
  if (!query) return [snippet];
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'ig');
  return snippet.split(regex).map((part, idx) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`highlight-${idx}`} className="bg-yellow-400 text-black">
        {part}
      </mark>
    ) : (
      <React.Fragment key={`text-${idx}`}>{part}</React.Fragment>
    ),
  );
};

export const useDocsViewer = () => {
  const ctx = useContext(DocsViewerContext);
  if (!ctx) {
    throw new Error('useDocsViewer must be used within a DocsViewerProvider');
  }
  return ctx;
};

export const DocsLink = forwardRef<
  HTMLAnchorElement,
  PropsWithChildren<DocsLinkProps>
>(({ appId, docPath, fallbackDoc, children, onMouseDown, ...rest }, ref) => {
    const { openDoc } = useDocsViewer();
    const { onClick, ...anchorProps } = rest;

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (onClick) onClick(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        openDoc({ appId, docPath, fallback: fallbackDoc });
      },
      [appId, docPath, fallbackDoc, onClick, openDoc],
    );

    return (
      <a
        {...anchorProps}
        ref={ref}
        href={docPath}
        onClick={handleClick}
        onMouseDown={onMouseDown}
      >
        {children}
      </a>
    );
  });
DocsLink.displayName = 'DocsLink';

const DocsViewerProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const layoutState = usePersistentState(
    'docs:layout',
    DEFAULT_LAYOUT,
    isLayoutState,
  ) as [
    LayoutState,
    React.Dispatch<React.SetStateAction<LayoutState>>,
    () => void,
    () => void,
  ];
  const [layout, setLayout] = layoutState;

  const lastDocsState = usePersistentState(
    'docs:last-open',
    {},
    isRecordOfStrings,
  ) as [
    Record<string, string>,
    React.Dispatch<React.SetStateAction<Record<string, string>>>,
    () => void,
    () => void,
  ];
  const [lastDocs, setLastDocs] = lastDocsState;

  const [isOpen, setIsOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<string | null>(null);
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const [pendingScroll, setPendingScroll] = useState<{
    id: string;
    updateUrl: boolean;
  } | null>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [contentHtml, setContentHtml] = useState('');
  const [activeHeading, setActiveHeading] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingMap = useMemo(() => {
    const entries = headings.map((heading) => [heading.id, heading.text] as const);
    return new Map(entries);
  }, [headings]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [] as Array<{ id: string; heading: string; snippet: ReactNode[] }>;

    return sections
      .map((section) => {
        const index = section.text.toLowerCase().indexOf(query);
        if (index === -1) return null;
        const start = Math.max(0, index - 40);
        const end = Math.min(section.text.length, index + query.length + 60);
        const snippet = section.text.slice(start, end);
        const heading = headingMap.get(section.id) ?? section.id;
        return {
          id: section.id,
          heading,
          snippet: highlightSnippet(snippet, query),
        };
      })
      .filter(Boolean)
      .slice(0, 8) as Array<{ id: string; heading: string; snippet: ReactNode[] }>;
  }, [headingMap, searchQuery, sections]);

  const scrollToHeading = useCallback(
    (id: string, updateUrl: boolean) => {
      if (!id) return false;
      const container = contentRef.current;
      if (!container) return false;
      const selector = `#${escapeSelector(id)}`;
      const target = container.querySelector(selector) as HTMLElement | null;
      if (!target) return false;
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setActiveHeading(id);
      if (updateUrl && typeof window !== 'undefined') {
        const { pathname, search } = window.location;
        window.history.replaceState(null, '', `${pathname}${search}#${id}`);
      }
      return true;
    },
    [],
  );

  const openDoc = useCallback(
    ({ appId, docPath, fallback }: OpenDocOptions) => {
      const stored = lastDocs[appId];
      const resolved = docPath ?? stored ?? fallback;
      if (!resolved) return;

      const [path, rawHash] = resolved.split('#');
      const hash = rawHash?.replace(/^#/, '') ?? '';

      setCurrentApp(appId);
      setIsOpen(true);
      setError(null);
      setSearchQuery('');
      setPendingScroll(hash ? { id: hash, updateUrl: true } : null);

      if (docPath || (!stored && fallback)) {
        const valueToStore = docPath ?? fallback ?? resolved;
        setLastDocs((prev) => ({
          ...prev,
          [appId]: valueToStore,
        }));
      }

      setActiveHeading(hash);

      if (currentDoc === path) {
        if (hash) {
          setPendingScroll({ id: hash, updateUrl: true });
        }
        return;
      }

      setCurrentDoc(path);
    },
    [currentDoc, lastDocs, setLastDocs],
  );

  const closeDoc = useCallback(() => {
    setIsOpen(false);
    setCurrentDoc(null);
    setCurrentApp(null);
    setHeadings([]);
    setSections([]);
    setContentHtml('');
    setPendingScroll(null);
    setActiveHeading('');
    setSearchQuery('');
    setError(null);
  }, []);

  const toggleDock = useCallback(() => {
    setLayout((prev) => ({
      ...prev,
      docked: !prev.docked,
    }));
  }, [setLayout]);

  useEffect(() => {
    if (!currentDoc || !isOpen) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(currentDoc);
        if (!response.ok) throw new Error('Failed to load docs');
        const markdown = await response.text();
        if (cancelled) return;

        const { marked } = await import('marked');
        if (cancelled) return;

        const tokens = marked.lexer(markdown) as TokensList;
        const slugger = new marked.Slugger();
        const computedHeadings: Heading[] = [];
        tokens.forEach((token) => {
          if (token.type === 'heading') {
            const id = slugger.slug(token.text ?? '');
            computedHeadings.push({
              id,
              text: token.text ?? '',
              level: token.depth ?? 1,
            });
          }
        });

        const headingQueue = [...computedHeadings];
        const renderer = new marked.Renderer();
        const fallbackSlugger = new marked.Slugger();
        renderer.heading = (text, level) => {
          const next = headingQueue.shift();
          const id = next?.id ?? fallbackSlugger.slug(text);
          return `<h${level} id="${id}">${text}</h${level}>`;
        };
        const html = DOMPurify.sanitize(
          marked.parse(markdown, { renderer }) as string,
        );
        if (cancelled) return;

        setContentHtml(html);
        setHeadings(computedHeadings);
        setSections(buildSections(tokens, computedHeadings));
        setLoading(false);
        setError(null);
        if (computedHeadings[0]) {
          setPendingScroll((prev) =>
            prev ?? {
              id: computedHeadings[0].id,
              updateUrl: false,
            },
          );
        }
      } catch {
        if (cancelled) return;
        setLoading(false);
        setError('Unable to load documentation.');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [currentDoc, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDoc();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [closeDoc, isOpen]);

  useEffect(() => {
    if (!isOpen || !contentHtml) return;
    if (pendingScroll) {
      const { id, updateUrl } = pendingScroll;
      const success = scrollToHeading(id, updateUrl);
      if (success) {
        setPendingScroll(null);
      }
      return;
    }
    if (!activeHeading && headings[0]) {
      scrollToHeading(headings[0].id, false);
    }
  }, [activeHeading, contentHtml, headings, isOpen, pendingScroll, scrollToHeading]);

  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = layout.width;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        const nextWidth = clampWidth(startWidth + delta);
        setLayout((prev) => ({ ...prev, width: nextWidth }));
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [layout.width, setLayout],
  );

  const handleResizeKey = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setLayout((prev) => ({
          ...prev,
          width: clampWidth(prev.width + 24),
        }));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setLayout((prev) => ({
          ...prev,
          width: clampWidth(prev.width - 24),
        }));
      }
    },
    [setLayout],
  );

  const viewerContext = useMemo(
    () => ({
      openDoc,
      closeDoc,
      isOpen,
      currentDoc,
      currentApp,
      toggleDock,
    }),
    [closeDoc, currentApp, currentDoc, isOpen, openDoc, toggleDock],
  );

  const panelWidth = clampWidth(layout.width);

  return (
    <DocsViewerContext.Provider value={viewerContext}>
      {children}
      {isOpen && (
        <>
          {!layout.docked && (
            <button
              type="button"
              aria-label="Close documentation overlay"
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closeDoc}
            />
          )}
          <aside
            role="complementary"
            aria-label="Documentation viewer"
            className={`fixed z-50 flex flex-col bg-gray-900 text-white border border-gray-800 shadow-2xl ${
              layout.docked ? 'top-0 bottom-0 right-0' : 'top-16 bottom-16 right-6 rounded-lg'
            }`}
            style={{ width: panelWidth }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {currentApp ?? 'Docs'}
                </p>
                <p className="text-sm font-semibold truncate">
                  {headings[0]?.text || currentDoc}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleDock}
                  aria-pressed={layout.docked}
                  className="px-2 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700 focus:outline-none focus:ring"
                >
                  {layout.docked ? 'Undock' : 'Dock'}
                </button>
                <button
                  type="button"
                  onClick={closeDoc}
                  aria-label="Close documentation"
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center focus:outline-none focus:ring"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="w-48 border-r border-gray-800 overflow-y-auto" aria-label="Table of contents">
                <div className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                  Contents
                </div>
                <ul className="space-y-1 px-3 pb-3 text-sm">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingScroll({ id: heading.id, updateUrl: true });
                          const success = scrollToHeading(heading.id, true);
                          if (success) {
                            setPendingScroll(null);
                          }
                        }}
                        className={`text-left w-full rounded px-2 py-1 hover:bg-gray-800 focus:outline-none focus:ring ${
                          activeHeading === heading.id ? 'bg-gray-800' : ''
                        }`}
                        style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                        aria-current={activeHeading === heading.id ? 'true' : undefined}
                      >
                        {heading.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-gray-800 p-3">
                  <label htmlFor="docs-search" className="sr-only">
                    Search documentation
                  </label>
                  <input
                    id="docs-search"
                    type="search"
                    placeholder="Search in this document"
                    aria-label="Search documentation"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring"
                  />
                  {searchQuery && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      {searchResults.length === 0 ? (
                        <p className="text-xs text-gray-400">No matches found.</p>
                      ) : (
                        <ul className="space-y-2" aria-label="Search results">
                          {searchResults.map((result, index) => (
                            <li key={`${result.id}-${index}`}>
                              <button
                                type="button"
                                className="w-full text-left text-xs rounded bg-gray-800 px-3 py-2 hover:bg-gray-700 focus:outline-none focus:ring"
                                onClick={() => {
                                  setPendingScroll({ id: result.id, updateUrl: true });
                                  const success = scrollToHeading(result.id, true);
                                  if (success) {
                                    setPendingScroll(null);
                                  }
                                  setSearchQuery('');
                                }}
                                aria-label={`Go to ${result.heading}`}
                              >
                                <span className="block text-blue-300 font-semibold">
                                  {result.heading}
                                </span>
                                <span className="block text-gray-100">
                                  {result.snippet}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div
                  ref={contentRef}
                  className="flex-1 overflow-y-auto px-4 pb-6 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: loading ? '<p>Loading...</p>' : contentHtml }}
                />
                {error && (
                  <div className="p-3 text-xs text-red-300 border-t border-red-500 bg-red-900/40">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Resize documentation drawer"
              onMouseDown={handleResizeStart}
              onKeyDown={handleResizeKey}
              className="absolute top-0 left-0 bottom-0 w-1 cursor-col-resize focus:outline-none focus:ring"
            />
          </aside>
        </>
      )}
    </DocsViewerContext.Provider>
  );
};

export default DocsViewerProvider;
