'use client';

import { useState } from 'react';
import Image from 'next/image';
import DocMegaMenu from './DocMegaMenu';

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const closeDocs = () => setDocsOpen(false);

  return (
    <header className="relative bg-gray-900 text-white">
      <nav className="flex items-center gap-4 p-4">
        <a href="/" className="flex items-center gap-2">
          <Image
            src="/k-logo.svg"
            alt="Kali Portfolio logo"
            width={32}
            height={32}
            className="h-8 w-auto sm:h-10"
            priority
          />
          <span className="text-xl font-semibold sm:text-2xl">
            Kali Portfolio
          </span>
        </a>
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

