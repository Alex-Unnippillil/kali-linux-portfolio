import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
}

interface Section {
  title: string;
  items: NavItem[];
}

interface MobileNavSheetProps {
  open: boolean;
  onClose: () => void;
  sections: Section[];
}

const SWIPE_THRESHOLD = 50;

export default function MobileNavSheet({ open, onClose, sections }: MobileNavSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const filteredSections = useMemo(() => {
    if (!query) return sections;
    const q = query.toLowerCase();
    return sections
      .map(s => ({ ...s, items: s.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(s => s.items.length > 0);
  }, [sections, query]);

  const flatItems = useMemo(() => filteredSections.flatMap(s => s.items), [filteredSections]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(h => Math.min(h + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        itemRefs.current[highlight]?.click();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, flatItems, highlight, onClose]);

  useEffect(() => {
    itemRefs.current[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight, filteredSections]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > SWIPE_THRESHOLD) onClose();
    } else {
      if (dy > SWIPE_THRESHOLD) {
        setHighlight(h => Math.min(h + 1, flatItems.length - 1));
      } else if (dy < -SWIPE_THRESHOLD) {
        setHighlight(h => Math.max(h - 1, 0));
      }
    }
  };

  let itemIndex = -1;

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 h-full w-72 bg-gray-800 text-white transform transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            className="w-full p-2 rounded bg-black/20 focus:outline-none"
            placeholder="Search..."
            aria-label="Search navigation"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <nav className="flex-1 overflow-y-auto" aria-label="Mobile Navigation">
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx}>
              <div className="px-4 pt-4 pb-2 text-xs uppercase text-gray-400">
                {section.title}
              </div>
              <ul>
                {section.items.map(item => {
                  itemIndex += 1;
                  const idx = itemIndex;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        ref={el => (itemRefs.current[idx] = el)}
                        className={`block px-4 py-2 ${idx === highlight ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                        onClick={onClose}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {sIdx !== filteredSections.length - 1 && (
                <hr className="my-2 border-gray-700" />
              )}
            </div>
          ))}
          {flatItems.length === 0 && (
            <div className="p-4 text-gray-400">No results</div>
          )}
        </nav>
      </aside>
    </div>
  );
}

