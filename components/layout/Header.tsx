'use client';

import { useState } from 'react';
import Link from 'next/link';
import DocMegaMenu from './DocMegaMenu';

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const closeDocs = () => setDocsOpen(false);

  return (
    <header className="relative bg-gray-900 text-white">
      <nav className="flex flex-col items-start gap-2 p-2 text-sm sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        <Link href="/get-kali" className="hover:underline">
          Get Kali
        </Link>
        <span className="hidden text-gray-600 sm:block">|</span>
        <Link href="/blog" className="hover:underline">
          Blog
        </Link>
        <span className="hidden text-gray-600 sm:block">|</span>
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
        <span className="hidden text-gray-600 sm:block">|</span>
        <Link href="/community" className="hover:underline">
          Community
        </Link>
        <span className="hidden text-gray-600 sm:block">|</span>
        <Link href="/developers" className="hover:underline">
          Developers
        </Link>
        <span className="hidden text-gray-600 sm:block">|</span>
        <Link href="/about" className="hover:underline">
          About
        </Link>
      </nav>
    </header>
  );
}

