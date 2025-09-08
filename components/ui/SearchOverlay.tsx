import React, { useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import EmptyState from './EmptyState';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const pages = [
  { title: 'Home', href: '/', category: 'Pages' },
  { title: 'Docs', href: '/docs', category: 'Pages' },
  { title: 'Apps', href: '/apps', category: 'Pages' },
];

const tools = [
  { title: 'Nmap', href: '/apps/nmap', category: 'Tools' },
  { title: 'Hydra', href: '/apps/hydra', category: 'Tools' },
  { title: 'Nikto', href: '/apps/nikto', category: 'Tools' },
];

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      inputRef.current?.focus();
      if (typeof window !== 'undefined') {
        const key = 'tool-search-hint-uses';
        const uses = Number(window.localStorage.getItem(key) || '0');
        if (uses < 2) {
          setShowHint(true);
          window.localStorage.setItem(key, String(uses + 1));
        } else {
          setShowHint(false);
        }
      }
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open, onClose]);

  const results = [...pages, ...tools].filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = results.reduce<Record<string, typeof results>>((acc, item) => {
    acc[item.category] = acc[item.category] || [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <CSSTransition
      in={open}
      timeout={200}
      classNames={{
        enter: 'opacity-0',
        enterActive: 'opacity-100 transition-opacity duration-200',
        exit: 'opacity-100',
        exitActive: 'opacity-0 transition-opacity duration-200',
      }}
      unmountOnExit
      nodeRef={nodeRef}
    >
      <div
        ref={nodeRef}
        className="fixed inset-0 bg-black/70 flex flex-col p-4"
        role="dialog"
        aria-modal="true"
      >
        {showHint && (
          <div
            className="mb-3 flex justify-center gap-4 text-sm text-white/70"
            aria-hidden="true"
          >
            <span>
              <kbd className="rounded bg-white/20 px-1">↑</kbd>
              <kbd className="ml-1 rounded bg-white/20 px-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="rounded bg-white/20 px-1">Enter</kbd> to open
            </span>
            <span>
              <kbd className="rounded bg-white/20 px-1">Esc</kbd> to close
            </span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          className="w-full p-3 text-lg rounded"
          placeholder="Search..."
          value={query}
          aria-label="Search query"
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mt-4 text-white space-y-4 overflow-y-auto">
          {Object.entries(grouped).map(([category, items]) => (
            <li key={category}>
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
                {category}
              </h2>
              <ul className="space-y-1">
                {items.map((r) => {
                  const segments =
                    r.href === '/' ? ['home'] : r.href.split('/').filter(Boolean);
                  return (
                    <li key={r.href}>
                      <a
                        href={r.href}
                        className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/10 focus:outline-none focus-visible:ring focus-visible:ring-white/50"
                      >
                        <span>{r.title}</span>
                        <span className="flex gap-1">
                          {segments.map((seg) => (
                            <span
                              key={seg}
                              className="rounded bg-white/20 px-1 text-xs capitalize"
                            >
                              {seg}
                            </span>
                          ))}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {query && results.length === 0 && (
            <li className="py-8">
              <EmptyState
                icon={<span>🔍</span>}
                headline="No results"
                helperText="Try a different search term"
              />
            </li>
          )}
        </ul>
      </div>
    </CSSTransition>
  );
}
