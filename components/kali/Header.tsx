import React, { useState } from 'react';
import ia from '../../data/ia.json';
import StatusPill from './StatusPill';
import SearchOverlay from '../ui/SearchOverlay';

interface NavItem {
  label: string;
  href?: string;
  children?: NavItem[];
}

const Header: React.FC = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [showTip, setShowTip] = useState(true);

  const hideTip = () => setShowTip(false);

  return (
    <header className="border-b border-gray-700 p-4">
      <nav aria-label="Main navigation">
        <ul className="flex flex-wrap items-center gap-4">
          {(ia as any).header.map((item: NavItem) => (
            <li key={item.label} className="relative">
              {item.children ? (
                <details>
                  <summary className="cursor-pointer list-none">{item.label}</summary>
                  <ul className="mt-2 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <a href={child.href} className="hover:underline">
                          {child.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <a href={item.href} className="hover:underline">
                  {item.label}
                </a>
              )}
            </li>
          ))}
          <li className="ml-auto relative">
            <button
              type="button"
              aria-label="Open search"
              onClick={() => {
                setSearchOpen(true);
                hideTip();
              }}
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={hideTip}
              onFocus={() => setShowTip(true)}
              onBlur={hideTip}
              className="p-1 rounded hover:bg-gray-700 focus:outline-none focus-visible:ring"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 3a7.5 7.5 0 006.15 12.65z"
                />
              </svg>
            </button>
            {showTip && (
              <div
                aria-hidden="true"
                className="absolute right-0 mt-2 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow hidden sm:block"
              >
                Search
              </div>
            )}
          </li>
          <li>
            <StatusPill />
          </li>
        </ul>
      </nav>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};

export default Header;
