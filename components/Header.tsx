import React, { useState } from 'react';
import SearchOverlay from './ui/SearchOverlay';
import DevelopersMenu from './Header/DevelopersMenu';

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex items-center justify-between p-2 bg-gray-800 text-white">
      <div className="flex items-center space-x-4">
        <div className="font-bold">Kali Linux Portfolio</div>
        <DevelopersMenu />
      </div>
      <button
        type="button"
        aria-label="Search"
        onClick={() => setSearchOpen(true)}
        className="p-2 hover:bg-gray-700 rounded transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
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
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
