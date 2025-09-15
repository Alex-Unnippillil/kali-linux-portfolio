import { useEffect, useRef, useState } from 'react';

export default function DocSearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const load = async () => {
      const res = await fetch(`/api/docs-search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setActive(0);
      }
    };
    const t = setTimeout(load, 100);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      const item = results[active];
      if (item) window.location.href = item.url;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="mt-20 w-full max-w-xl rounded bg-white p-4 text-black shadow-lg">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Search docs"
          className="w-full border border-gray-300 p-2"
        />
        <ul className="mt-2 max-h-64 overflow-y-auto">
          {results.map((r: any, idx: number) => (
            <li key={r.id}>
              <button
                className={`block w-full text-left p-2 ${idx === active ? 'bg-gray-200' : ''}`}
                onClick={() => (window.location.href = r.url)}
              >
                <span className="font-bold">{r.title}</span>
                <span className="block text-sm text-gray-600">{r.content.slice(0, 80)}</span>
              </button>
            </li>
          ))}
          {!results.length && query && <li className="p-2 text-gray-500">No results</li>}
        </ul>
      </div>
    </div>
  );
}
