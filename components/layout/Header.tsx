'use client';

import { useState } from 'react';
import DocMegaMenu from './DocMegaMenu';

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const closeDocs = () => setDocsOpen(false);

  return (
    <header className="relative bg-gray-900 text-white">
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

