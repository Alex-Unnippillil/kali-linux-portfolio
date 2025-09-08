'use client';

import { useEffect, useRef } from 'react';

interface DocMegaMenuProps {
  onClose: () => void;
}

export default function DocMegaMenu({ onClose }: DocMegaMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed left-0 top-12 z-50 w-full bg-white shadow-lg p-4 rtl:left-auto rtl:right-0"
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        <li>
          <a href="/docs" className="block hover:underline">
            Docs pages
          </a>
        </li>
        <li>
          <a href="/tools" className="block hover:underline">
            Tools docs
          </a>
        </li>
        <li>
          <a href="/faq" className="block hover:underline">
            FAQ
          </a>
        </li>
        <li>
          <a href="/known-issues" className="block hover:underline">
            Known Issues
          </a>
        </li>
      </ul>
    </div>
  );
}

