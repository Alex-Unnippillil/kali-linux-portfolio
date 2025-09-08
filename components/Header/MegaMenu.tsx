'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface MegaMenuProps {
  onClose: () => void;
}

const CLOSE_DELAY = 200;

export default function MegaMenu({ onClose }: MegaMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      if (closeTimeout.current) {
        clearTimeout(closeTimeout.current);
      }
    };
  }, [onClose]);

  const handleMouseEnter = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
    }
  };

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(onClose, CLOSE_DELAY);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed left-0 top-12 z-50 w-full bg-white shadow-lg p-4 rtl:left-auto rtl:right-0"
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        <li>
          <Link href="/docs" className="block hover:underline">
            Docs pages
          </Link>
        </li>
        <li>
          <Link href="/tools" className="block hover:underline">
            Tools docs
          </Link>
        </li>
        <li>
          <Link href="/faq" className="block hover:underline">
            FAQ
          </Link>
        </li>
        <li>
          <Link href="/known-issues" className="block hover:underline">
            Known Issues
          </Link>
        </li>
      </ul>
    </div>
  );
}

