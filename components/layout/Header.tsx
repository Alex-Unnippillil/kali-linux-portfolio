'use client';

import { useEffect, useState } from 'react';
import DocMegaMenu from './DocMegaMenu';

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const closeDocs = () => setDocsOpen(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 64);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 bg-white text-gray-900 dark:bg-gray-900 dark:text-white ${
        scrolled ? 'shadow-md backdrop-blur-md' : ''
      }`}
    >
      <nav className="flex gap-4 p-4">
        <a href="/" className="hover:underline">
          Home
        </a>
        <div
          className="relative"
          onMouseEnter={() => setDocsOpen(true)}
        >
          <button
            type="button"
            onClick={() => setDocsOpen((v) => !v)}
            className="hover:underline"
          >
            Documentation
          </button>
          {docsOpen && <DocMegaMenu onClose={closeDocs} />}
        </div>
      </nav>
    </header>
  );
}

