import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import toolsData from '../../data/kali-tools.json';

interface ToolItem {
  type: 'tool';
  id: string;
  name: string;
}

interface CategoryItem {
  type: 'category';
  slug: string;
  name: string;
}

const categories: CategoryItem[] = [
  { type: 'category', slug: 'information-gathering', name: 'Information Gathering' },
  { type: 'category', slug: 'vulnerability-analysis', name: 'Vulnerability Analysis' },
  { type: 'category', slug: 'web-applications', name: 'Web Applications' },
  { type: 'category', slug: 'password-attacks', name: 'Password Attacks' },
  { type: 'category', slug: 'wireless-attacks', name: 'Wireless Attacks' },
  { type: 'category', slug: 'exploitation-tools', name: 'Exploitation Tools' },
  { type: 'category', slug: 'sniffing-spoofing', name: 'Sniffing & Spoofing' },
  { type: 'category', slug: 'maintaining-access', name: 'Maintaining Access' },
  { type: 'category', slug: 'reverse-engineering', name: 'Reverse Engineering' },
  { type: 'category', slug: 'stress-testing', name: 'Stress Testing' },
  { type: 'category', slug: 'forensics', name: 'Forensics' },
  { type: 'category', slug: 'reporting-tools', name: 'Reporting Tools' },
  { type: 'category', slug: 'hardware-hacking', name: 'Hardware Hacking' },
  { type: 'category', slug: 'miscellaneous', name: 'Miscellaneous' },
];

const ToolSearchOverlay: React.FC = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<ToolItem | CategoryItem>>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fuseRef = useRef<any>(null);

  const items = useMemo(() => {
    const tools: ToolItem[] = (toolsData as ToolItem[]).map((t) => ({
      type: 'tool',
      id: t.id,
      name: t.name,
    }));
    return [...tools, ...categories];
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable;
      if (isInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || fuseRef.current) return;
    import('fuse.js').then((m) => {
      const Fuse = m.default || m;
      fuseRef.current = new Fuse(items, {
        keys: ['name'],
        threshold: 0.3,
      });
    });
  }, [open, items]);

  useEffect(() => {
    if (!fuseRef.current) return;
    if (!query) {
      setResults([]);
      setActive(0);
      return;
    }
    const t0 = performance.now();
    const res = fuseRef.current.search(query, { limit: 20 }).map((r: any) => r.item);
    const t1 = performance.now();
    if (t1 - t0 > 50) {
      console.warn('Tool search exceeded 50ms:', t1 - t0);
    }
    setResults(res);
    setActive(0);
  }, [query]);

  const select = useCallback(
    (item: ToolItem | CategoryItem) => {
      setOpen(false);
      setQuery('');
      if (item.type === 'tool') {
        window.location.href = `https://www.kali.org/tools/${item.id}/`;
      } else {
        router.push(`/tools?category=${encodeURIComponent(item.slug)}`);
      }
    },
    [router],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      select(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded bg-white p-4 shadow-lg">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search tools..."
          aria-label="Search tools"
          className="mb-2 w-full rounded border p-2"
        />
        <ul className="max-h-64 overflow-y-auto">
          {results.map((item, idx) => (
            <li key={`${item.type}-${'id' in item ? item.id : item.slug}`}>
              <button
                type="button"
                onClick={() => select(item)}
                className={`flex w-full items-center justify-between rounded p-2 text-left hover:bg-gray-200 ${idx === active ? 'bg-gray-200' : ''}`}
              >
                <span>{item.name}</span>
                {item.type === 'category' && (
                  <span className="ml-2 text-xs text-gray-500">Category</span>
                )}
              </button>
            </li>
          ))}
          {!results.length && query && (
            <li className="p-2 text-sm text-gray-500">No results</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ToolSearchOverlay;
