'use client';

import { useEffect, useRef, useState } from 'react';
import Drawer from 'rc-drawer';
import { Icon } from '../ui/Icon';
import ia from '../../data/ia.json';

interface Props {
  className?: string;
}

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

export default function MobileNav({ className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);

  const sections: NavItem[] = (ia as any).header;

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') setOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current !== null) {
      const diff = e.touches[0].clientX - touchStartX.current;
      if (diff < -50) {
        setOpen(false);
        touchStartX.current = null;
      }
    }
  };

  const filter = (label: string) => label.toLowerCase().includes(query.toLowerCase());

  const filteredSections = sections
    .map((sec) => {
      const children = sec.children?.filter((c) => filter(c.label)) || [];
      if (!query || filter(sec.label) || children.length > 0) {
        return { ...sec, children };
      }
      return null;
    })
    .filter(Boolean) as NavItem[];

  return (
    <div className={className}>
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        className="p-4"
      >
        <Icon name="menu" className="w-6 h-6" />
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        handler={false}
        placement="left"
        width="100%"
        level={null}
      >
        <div
          className="h-full bg-gray-900 text-white flex flex-col"
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          <div className="p-4 border-b border-gray-800">
            <input
              ref={searchRef}
              aria-label="Search navigation"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full p-2 rounded bg-gray-800"
            />
          </div>
          <nav className="flex-1 overflow-y-auto" aria-label="Mobile navigation">
            {filteredSections.map((section) => (
              <div key={section.label} className="p-4 border-b border-gray-800">
                {section.children && section.children.length > 0 ? (
                  <>
                    <h2 className="mb-2 text-sm font-bold">{section.label}</h2>
                    <ul className="space-y-2">
                      {section.children.map((child) => (
                        <li key={child.label}>
                          <a
                            href={child.href}
                            className="block px-2 py-1 rounded hover:bg-gray-800 focus:bg-gray-800"
                          >
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <a
                    href={section.href}
                    className="block font-bold hover:underline"
                  >
                    {section.label}
                  </a>
                )}
              </div>
            ))}
          </nav>
        </div>
      </Drawer>
    </div>
  );
}

