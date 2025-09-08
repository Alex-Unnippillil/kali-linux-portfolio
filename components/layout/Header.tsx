'use client';

import { useState } from 'react';
import Link from 'next/link';
import DocMegaMenu from './DocMegaMenu';
import MobileNav from './MobileNav';

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const closeDocs = () => setDocsOpen(false);

  return (
    <header className="relative bg-gray-900 text-white rtl:text-right flex items-center justify-between">
      <Link href="/" className="p-4 hover:underline md:hidden">
        Home
      </Link>
      <nav role="navigation" className="hidden md:flex gap-4 p-4 rtl:flex-row-reverse">
        <Link href="/" className="hover:underline">
          Home
        </Link>
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
      <MobileNav className="md:hidden" />
    </header>
  );
}

