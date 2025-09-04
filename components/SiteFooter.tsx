import Link from 'next/link';
import React from 'react';

const SiteFooter: React.FC = () => {
  return (
    <footer className="mt-8 p-4 text-center text-gray-300 bg-gray-900 border-t border-gray-700" aria-label="Footer">
      <nav aria-label="Sitemap" className="mb-3">
        <ul className="flex flex-wrap justify-center gap-4">
          <li>
            <Link href="/apps" title="Browse desktop apps" aria-label="Browse desktop apps">
              Apps
            </Link>
          </li>
          <li>
            <Link href="/games" title="Play classic games" aria-label="Play classic games">
              Games
            </Link>
          </li>
          <li>
            <Link href="/profile" title="Read more about me" aria-label="Read more about me">
              Profile
            </Link>
          </li>
          <li>
            <Link href="/apps/contact" title="Send a message" aria-label="Send a message">
              Contact
            </Link>
          </li>
        </ul>
      </nav>
      <nav aria-label="Social links" className="mb-3">
        <ul className="flex justify-center gap-4">
          <li>
            <a
              href="https://github.com/Alex-Unnippillil"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub profile"
              aria-label="GitHub profile"
            >
              GitHub
            </a>
          </li>
          <li>
            <a
              href="https://www.linkedin.com/in/alexunnippillil"
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn profile"
              aria-label="LinkedIn profile"
            >
              LinkedIn
            </a>
          </li>
          <li>
            <a href="mailto:alex@unnippillil.com" title="Send email" aria-label="Send email">
              Email
            </a>
          </li>
        </ul>
      </nav>
      <p className="mb-2 text-sm">
        📍 Toronto, Canada (UTC-5) — <span className="italic">available 09:00–17:00 ET</span>
      </p>
      <p className="text-xs text-gray-400">
        Thanks for visiting! Reach out if you have questions or would like to collaborate.
      </p>
    </footer>
  );
};

export default SiteFooter;
