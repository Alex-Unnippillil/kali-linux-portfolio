'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import MegaMenu from '../Header/MegaMenu';

const OPEN_DELAY = 100;

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDocs = () => {
    setDocsOpen(false);
  };

  const handleMouseEnter = () => {
    if (openTimeout.current) {
      clearTimeout(openTimeout.current);
    }
    openTimeout.current = setTimeout(() => setDocsOpen(true), OPEN_DELAY);
  };

  const handleMouseLeave = () => {
    if (openTimeout.current) {
      clearTimeout(openTimeout.current);
    }
  };

  useEffect(() => {
    return () => {
      if (openTimeout.current) {
        clearTimeout(openTimeout.current);
      }
    };
  }, []);

  return (
    <header className="relative bg-gray-900 text-white rtl:text-right">
      <nav className="flex gap-4 p-4 rtl:flex-row-reverse">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            onClick={() => setDocsOpen((v) => !v)}
            className="hover:underline"
          >
            Documentation
          </button>
          {docsOpen && <MegaMenu onClose={closeDocs} />}
        </div>
      </nav>
    </header>
  );
}

