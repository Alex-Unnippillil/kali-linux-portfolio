import React, { useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const pages = [
  { title: 'Home', href: '/' },
  { title: 'Docs', href: '/docs' },
  { title: 'Apps', href: '/apps' },
];

const tools = [
  { title: 'Nmap', href: '/apps/nmap' },
  { title: 'Hydra', href: '/apps/hydra' },
  { title: 'Nikto', href: '/apps/nikto' },
];

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const escaped = q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, 'ig');
    const parts = text.split(regex);
    const matches = text.match(regex);
    const nodes: React.ReactNode[] = [];
    parts.forEach((part, i) => {
      nodes.push(part);
      if (matches && matches[i]) {
        nodes.push(
          <mark key={`m-${i}`} className="bg-yellow-500 text-black">
            {matches[i]}
          </mark>
        );
      }
    });
    return nodes;
  };

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

  const results = [...pages, ...tools].filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

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
        className="fixed inset-0 z-50 bg-black/70 flex flex-col p-4"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close search"
          onClick={onClose}
          className="self-end mb-2 p-2 text-white hover:bg-white/10 rounded"
        >
          ✕
        </button>
        <input
          ref={inputRef}
          type="text"
          className="w-full p-3 text-lg rounded"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mt-4 text-white divide-y divide-white/10 overflow-y-auto text-sm">
          {results.map((r) => (
            <li key={r.href}>
              <a href={r.href} className="block px-2 py-2 hover:bg-white/10">
                {highlight(r.title, query)}
              </a>
            </li>
          ))}
          {query && results.length === 0 && (
            <li className="px-2 py-2 text-gray-300">No results</li>
          )}
        </ul>
      </div>
    </CSSTransition>
  );
}
