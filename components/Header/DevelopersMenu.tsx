import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const items = [
  { href: '/git-repositories', label: 'Git Repositories' },
  { href: '/packages', label: 'Packages' },
  { href: '/auto-package-tests', label: 'Auto Package Tests' },
  { href: '/bug-tracker', label: 'Bug Tracker' },
  { href: '/nethunter-stats', label: 'NetHunter Stats' },
];

export default function DevelopersMenu() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !btnRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        Developers
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-1 z-50 bg-ub-grey text-white shadow-lg p-2"
          tabIndex={-1}
        >
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-2 py-1 hover:underline"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

