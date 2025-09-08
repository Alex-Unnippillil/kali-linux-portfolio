import React, { useEffect, useRef, useState } from 'react';
import ia from '../../data/ia.json';
import { Icon } from '../ui/Icon';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileSheet({ open, onClose }: MobileSheetProps) {
  const [query, setQuery] = useState('');
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startX.current !== null) {
      const diff = e.changedTouches[0].clientX - startX.current;
      if (diff > 50) onClose();
    }
    startX.current = null;
  };

  const navItems: NavItem[] = (ia as any).header;

  const matches = (label: string) =>
    label.toLowerCase().includes(query.toLowerCase());

  const filtered = navItems
    .map((item) => {
      if (!query) return item;
      if (item.children) {
        const kids = item.children.filter((c) => matches(c.label));
        if (matches(item.label) || kids.length) return { ...item, children: kids };
        return null;
      }
      return matches(item.label) ? item : null;
    })
    .filter(Boolean) as NavItem[];

  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`absolute left-0 top-0 h-full w-3/4 max-w-xs bg-ub-grey text-white transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <span className="font-semibold">Menu</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="p-1"
          >
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-full">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search navigation"
            className="w-full mb-4 p-2 rounded bg-black/20 focus:outline-none"
          />
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <details>
                    <summary className="px-2 py-1 rounded hover:bg-white/10 cursor-pointer">
                      {item.label}
                    </summary>
                    <ul className="pl-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <a
                            href={child.href}
                            className="block px-2 py-1 rounded hover:bg-white/10"
                          >
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <a
                    href={item.href}
                    className="block px-2 py-1 rounded hover:bg-white/10"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

