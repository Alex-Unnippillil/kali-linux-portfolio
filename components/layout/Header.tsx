'use client';

import { useState, useEffect } from 'react';
import DocMegaMenu from './DocMegaMenu';
import posts from '../../data/kali-blog.json';
import Link from 'next/link';

interface Post {
  title: string;
  link: string;
  date: string;
}

export default function Header() {
  const [docsOpen, setDocsOpen] = useState(false);
  const [release, setRelease] = useState<Post | null>(null);
  const [showRelease, setShowRelease] = useState(false);
  const closeDocs = () => setDocsOpen(false);

  useEffect(() => {
    const latest = (posts as Post[]).find((p) => p.link.includes('release'));
    if (!latest) return;
    try {
      const dismissed = sessionStorage.getItem('dismissed-release');
      if (dismissed === latest.date) return;
    } catch {
      // Ignore access errors
    }
    setRelease(latest);
    setShowRelease(true);
  }, []);

  const dismissRelease = () => {
    if (release) {
      try {
        sessionStorage.setItem('dismissed-release', release.date);
      } catch {
        // Ignore write errors
      }
    }
    setShowRelease(false);
  };

  return (
    <header className="relative bg-gray-900 text-white rtl:text-right">
      {showRelease && release && (
        <div className="absolute inset-x-0 top-0 flex justify-center mt-2">
          <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-blue-600 text-white text-sm">
            <a
              href={release.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              New release: {release.title}
            </a>
            <button
              type="button"
              aria-label="Dismiss release notification"
              onClick={dismissRelease}
              className="hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <nav className="flex gap-4 p-4 rtl:flex-row-reverse">
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
    </header>
  );
}

