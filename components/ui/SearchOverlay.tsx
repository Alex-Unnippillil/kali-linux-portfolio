import React, { useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';
import EmptyState from './EmptyState';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const items = [
  // Tools
  { title: 'Nmap', href: '/apps/nmap', category: 'Tools' },
  { title: 'Hydra', href: '/apps/hydra', category: 'Tools' },
  { title: 'Nikto', href: '/apps/nikto', category: 'Tools' },
  // Docs
  { title: 'Documentation', href: '/docs', category: 'Docs' },
  { title: 'API Reference', href: '/docs/api', category: 'Docs' },
  // Platforms
  { title: 'Kali Linux', href: '/platforms/kali-linux', category: 'Platforms' },
  { title: 'Ubuntu', href: '/platforms/ubuntu', category: 'Platforms' },
  // Blog
  { title: 'Blog', href: '/blog', category: 'Blog' },
  { title: 'Release Notes', href: '/blog/releases', category: 'Blog' },
];

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      inputRef.current?.focus();
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

  const results = items.filter((item) =>
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-xl text-white">
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded bg-white/10 p-3 text-lg"
            placeholder="Search..."
            value={query}
            aria-label="Search query"
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto">
            {Object.entries(grouped).map(([category, items]) => (
              <li key={category}>
                <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
                  {category}
                </h2>
                <ul className="space-y-1 text-sm">
                  {items.map((r) => {
                    const segments =
                      r.href === '/' ? ['home'] : r.href.split('/').filter(Boolean);
                    return (
                      <li key={r.href}>
                        <a
                          href={r.href}
                          className="flex items-center justify-between rounded px-2 py-1 hover:bg-white/10 focus:outline-none focus-visible:ring focus-visible:ring-white/50"
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
      </div>
    </CSSTransition>
  );
}
