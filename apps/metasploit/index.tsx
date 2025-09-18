'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DOMPurify from 'dompurify';
import modulesData from '../../components/apps/metasploit/modules.json';
import MetasploitApp from '../../components/apps/metasploit';
import Toast from '../../components/ui/Toast';

interface Module {
  name: string;
  description: string;
  type: string;
  severity: string;
  [key: string]: any;
}

interface TreeNode {
  [key: string]: TreeNode | Module[] | undefined;
  __modules?: Module[];
}

const typeColors: Record<string, string> = {
  auxiliary: 'bg-blue-500',
  exploit: 'bg-red-500',
  post: 'bg-green-600',
};

type MarkdownModule = string | { default: string };
type MarkdownContext = {
  keys: () => string[];
} & ((id: string) => MarkdownModule);

type RequireWithContext = {
  <T = unknown>(path: string): T;
  context?: (
    path: string,
    deep?: boolean,
    filter?: RegExp,
  ) => MarkdownContext;
};

declare const require: RequireWithContext;

const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel|ftp):|#|\/)/i;

const createSlugger = () => {
  const counts = new Map<string, number>();
  const sanitize = (value: string) => {
    const base = value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    return base || 'section';
  };
  return {
    reset: () => counts.clear(),
    slug: (value: string) => {
      const base = sanitize(value);
      const count = counts.get(base) ?? 0;
      counts.set(base, count + 1);
      return count ? `${base}-${count}` : base;
    },
  };
};

let cachedDocsContext: MarkdownContext | null = null;

const getDocsContext = (): MarkdownContext | null => {
  if (cachedDocsContext) return cachedDocsContext;
  if (typeof require === 'undefined' || typeof require.context !== 'function') {
    return null;
  }
  cachedDocsContext = require.context(
    '../../components/apps/metasploit/docs',
    false,
    /\.md$/,
  );
  return cachedDocsContext;
};

const toDocKey = (moduleName: string) => `./${moduleName.replace(/\//g, '__')}.md`;

const defaultDocLoader = async (moduleName: string): Promise<string> => {
  const context = getDocsContext();
  if (!context) throw new Error('DOC_SOURCE_UNAVAILABLE');
  const key = toDocKey(moduleName);
  if (!context.keys().includes(key)) {
    throw new Error('DOC_NOT_FOUND');
  }
  const mod = context<MarkdownModule>(key);
  const assetUrl = typeof mod === 'string' ? mod : mod.default;
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error('DOC_FETCH_FAILED');
  }
  return response.text();
};

type MarkedModule = typeof import('marked');

let markedModulePromise: Promise<MarkedModule> | null = null;

const loadMarkedModule = async (): Promise<MarkedModule> => {
  if (!markedModulePromise) {
    markedModulePromise = (async () => {
      try {
        const mod = (await import('marked')) as MarkedModule;
        mod.marked.setOptions({ mangle: false, headerIds: false });
        return mod;
      } catch (error) {
        if (typeof require === 'function') {
          const mod = require<MarkedModule>('marked');
          mod.marked.setOptions({ mangle: false, headerIds: false });
          return mod;
        }
        throw error;
      }
    })();
  }
  return markedModulePromise;
};

interface Heading {
  id: string;
  text: string;
  depth: number;
}

const renderMarkdown = (markdown: string, markedModule: MarkedModule) => {
  const slugger = createSlugger();
  const tokens = markedModule.lexer(markdown) as Array<{
    type?: string;
    depth?: number;
    text?: string;
  }>;
  slugger.reset();
  const navHeadings: Heading[] = [];
  tokens.forEach((token) => {
    if (token?.type === 'heading' && typeof token.depth === 'number' && token.depth <= 4) {
      const id = slugger.slug(token.text || '');
      navHeadings.push({ id, text: token.text || '', depth: token.depth });
    }
  });
  slugger.reset();
  const renderer = new markedModule.Renderer();
  renderer.heading = (text, level) => {
    const id = slugger.slug(text);
    return `<h${level} id="${id}">${text}</h${level}>`;
  };
  const rawHtml = markedModule.marked(markdown, { renderer });
  const sanitized = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_URI_REGEXP,
  });
  return { html: sanitized, headings: navHeadings };
};

const defaultMarkdownRenderer = async (markdown: string) => {
  const markedModule = await loadMarkedModule();
  return renderMarkdown(markdown, markedModule);
};

type MarkdownRenderer = (
  markdown: string,
) => Promise<{ html: string; headings: Heading[] }>;

interface DocsViewerProps {
  moduleName: string | null;
  docTitle?: string;
  docLoader?: (moduleName: string) => Promise<string>;
  markdownRenderer?: MarkdownRenderer;
}

function buildTree(mods: Module[]): TreeNode {
  const root: TreeNode = {};
  mods.forEach((mod) => {
    const parts = mod.name.split('/');
    let node: TreeNode = root;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        if (!node.__modules) node.__modules = [];
        node.__modules.push(mod);
      } else {
        node[part] = (node[part] as TreeNode) || {};
        node = node[part] as TreeNode;
      }
    });
  });
  return root;
}

const decodeHashFromUrl = (value: string) => {
  const [, hash] = value.split('#');
  return hash ? decodeURIComponent(hash) : '';
};

export const DocsViewer: React.FC<DocsViewerProps> = ({
  moduleName,
  docTitle,
  docLoader = defaultDocLoader,
  markdownRenderer = defaultMarkdownRenderer,
}) => {
  const router = useRouter();
  const [renderedHtml, setRenderedHtml] = useState('');
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHash, setActiveHash] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToHeading = useCallback(
    (id: string, smooth = false) => {
      if (!id) return;
      const root = contentRef.current;
      if (!root) return;
      const safeId =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(id)
          : id.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
      const target = root.querySelector<HTMLElement>(`#${safeId}`);
      if (target) {
        target.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'start',
        });
      }
    },
    [],
  );

  const basePath = useMemo(() => router.asPath.split('#')[0], [router.asPath]);

  useEffect(() => {
    setActiveHash(decodeHashFromUrl(router.asPath));
  }, [router.asPath]);

  useEffect(() => {
    const events = router.events;
    if (!events || !events.on) return;
    const handler = (url: string) => {
      setActiveHash(decodeHashFromUrl(url));
    };
    events.on('hashChangeComplete', handler);
    return () => {
      events.off?.('hashChangeComplete', handler);
    };
  }, [router.events]);

  useEffect(() => {
    if (!moduleName) {
      setRenderedHtml('');
      setHeadings([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const markdown = await docLoader(moduleName);
        if (cancelled) return;
        const { html, headings: navHeadings } = await markdownRenderer(
          markdown,
        );
        if (cancelled) return;
        setRenderedHtml(html);
        setHeadings(navHeadings);
        setError(null);
        const container = scrollContainerRef.current;
        if (container) {
          if (typeof container.scrollTo === 'function') {
            container.scrollTo({ top: 0 });
          } else {
            container.scrollTop = 0;
          }
        }
      } catch {
        if (cancelled) return;
        setError('Documentation not available.');
        setRenderedHtml('');
        setHeadings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moduleName, docLoader, markdownRenderer]);

  useEffect(() => {
    if (!renderedHtml || !activeHash) return;
    scrollToHeading(activeHash);
  }, [renderedHtml, activeHash, scrollToHeading]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('#')) {
        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
      } else {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }, [renderedHtml]);

  const handleJump = (id: string) => {
    if (!id) return;
    scrollToHeading(id, true);
    setActiveHash(id);
    void router.replace(`${basePath}#${encodeURIComponent(id)}`, undefined, {
      shallow: true,
      scroll: false,
    });
  };

  const handleBackToTop = () => {
    const container = scrollContainerRef.current;
    if (container) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.scrollTop = 0;
      }
    }
    setActiveHash('');
    void router.replace(basePath, undefined, { shallow: true, scroll: false });
  };

  if (!moduleName) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
        Select a module to load documentation.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 md:flex-row">
      <nav
        aria-label="Module table of contents"
        className="md:w-56 flex-shrink-0 space-y-3 rounded border border-gray-200 bg-white/70 p-3 text-sm dark:border-gray-700 dark:bg-ub-grey"
      >
        <div>
          <p className="font-semibold">{docTitle || 'Module documentation'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-300">
            Jump to a section or return to the top.
          </p>
        </div>
        <ul className="space-y-1">
          {headings.map((heading) => {
            const indent = Math.max(0, heading.depth - 2) * 12;
            const isActive = activeHash === heading.id;
            return (
              <li key={heading.id}>
                <button
                  type="button"
                  onClick={() => handleJump(heading.id)}
                  className={`w-full rounded px-2 py-1 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isActive ? 'bg-gray-100 font-semibold dark:bg-gray-700' : ''
                  }`}
                  style={{ marginLeft: indent }}
                >
                  {heading.text}
                </button>
              </li>
            );
          })}
          {headings.length === 0 && (
            <li className="text-gray-500 dark:text-gray-300">No headings available.</li>
          )}
        </ul>
        <button
          type="button"
          onClick={handleBackToTop}
          className="w-full rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-500"
        >
          Back to top
        </button>
      </nav>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto rounded border border-gray-200 bg-white/80 p-4 text-sm leading-relaxed text-gray-900 dark:border-gray-700 dark:bg-ub-grey dark:text-gray-200"
      >
        {loading ? (
          <p>Loading documentation…</p>
        ) : error ? (
          <p>{error}</p>
        ) : renderedHtml ? (
          <div
            ref={contentRef}
            className="space-y-4"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <p>No additional documentation is available for this module.</p>
        )}
      </div>
    </div>
  );
};

const MetasploitPage: React.FC = () => {
  const [selected, setSelected] = useState<Module | null>(null);
  const [split, setSplit] = useState(60);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');

  const allTags = useMemo(
    () =>
      Array.from(
        new Set((modulesData as Module[]).flatMap((m) => m.tags || [])),
      ).sort(),
    [],
  );

  const filteredModules = useMemo(
    () =>
      (modulesData as Module[]).filter((m) => {
        if (tag && !(m.tags || []).includes(tag)) return false;
        if (query) {
          const q = query.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [tag, query],
  );

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  useEffect(() => {
    setSelected(null);
  }, [query, tag]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

  const handleGenerate = () => setToast('Payload generated');

  const renderTree = (node: TreeNode) => (
    <ul className="ml-2">
      {Object.entries(node)
        .filter(([k]) => k !== '__modules')
        .map(([key, child]) => (
          <li key={key}>
            <details>
              <summary className="cursor-pointer">{key}</summary>
              {renderTree(child as TreeNode)}
            </details>
          </li>
        ))}
      {(node.__modules || []).map((mod) => (
        <li key={mod.name}>
          <button
            onClick={() => setSelected(mod)}
            className="flex justify-between w-full text-left px-1 py-0.5 hover:bg-gray-100"
          >
            <span>{mod.name.split('/').pop()}</span>
            <span
              className={`ml-2 text-xs text-white px-1 rounded ${typeColors[mod.type] || 'bg-gray-500'}`}
            >
              {mod.type}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r overflow-auto p-2">
        <input
          type="text"
          placeholder="Search modules"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-1 mb-2 border rounded"
        />
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            onClick={() => setTag('')}
            className={`px-2 py-0.5 text-xs rounded ${
              tag === '' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-2 py-0.5 text-xs rounded ${
                tag === t ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {renderTree(tree)}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
          {selected ? (
            <>
              <header>
                <h2 className="mb-2 flex items-center text-lg font-bold">
                  {selected.name}
                  <span
                    className={`ml-2 rounded px-2 py-0.5 text-xs text-white ${
                      typeColors[selected.type] || 'bg-gray-500'
                    }`}
                  >
                    {selected.type}
                  </span>
                </h2>
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
                  {selected.description}
                </p>
              </header>
              <div className="flex-1 min-h-0">
                <DocsViewer
                  moduleName={selected.name}
                  docTitle={selected.doc || selected.name}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-300">
              Select a module to view details.
            </div>
          )}
        </div>
        <div ref={splitRef} className="h-96 border-t flex flex-col">
          <div style={{ height: `calc(${split}% - 2px)` }} className="overflow-auto">
            <MetasploitApp />
          </div>
          <div
            className="h-1 bg-gray-400 cursor-row-resize"
            onMouseDown={() => (dragging.current = true)}
          />
          <div
            style={{ height: `calc(${100 - split}% - 2px)` }}
            className="overflow-auto p-2 space-y-2"
          >
            <h3 className="font-semibold">Generate Payload</h3>
            <input
              type="text"
              placeholder="Payload options..."
              className="border p-1 w-full"
            />
            <button
              onClick={handleGenerate}
              className="px-2 py-1 bg-blue-500 text-white rounded"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default MetasploitPage;

