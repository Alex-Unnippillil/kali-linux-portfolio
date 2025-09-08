'use client';

import { useState } from 'react';
import DocMegaMenu from './DocMegaMenu';
import AboutMegaMenu from './AboutMegaMenu';

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const closeDocs = () => setDocsOpen(false);
  const closeAbout = () => setAboutOpen(false);

  return (
    <header className="relative bg-gray-900 text-white rtl:text-right">
      <nav className="flex gap-4 p-4 rtl:flex-row-reverse">
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
        <div
          className="relative"
          onMouseEnter={() => setAboutOpen(true)}
        >
          <button
            type="button"
            onClick={() => setAboutOpen((v) => !v)}
            className="hover:underline"
          >
            About
          </button>
          {aboutOpen && <AboutMegaMenu onClose={closeAbout} />}
        </div>
      </nav>
    </header>
  );
}

