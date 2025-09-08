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
        className="fixed inset-0 bg-black/70 flex flex-col p-4"
        role="dialog"
        aria-modal="true"
      >
        <input
          ref={inputRef}
          type="text"
          className="w-full p-3 text-lg rounded"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mt-4 text-white space-y-1 overflow-y-auto">
          {results.map((r) => (
            <li key={r.href}>
              <a href={r.href} className="block px-2 py-1 rounded hover:bg-white/10">
                {r.title}
              </a>
            </li>
          ))}
          {query && results.length === 0 && (
            <li className="px-2 py-1 text-gray-300">No results</li>
          )}
        </ul>
      </div>
    </CSSTransition>
  );
}
