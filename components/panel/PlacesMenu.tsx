'use client';

import React, { useState } from 'react';

const DEFAULT_PLACES = [
  { label: 'Home', path: '/home/kali' },
  { label: 'Desktop', path: '/home/kali/Desktop' },
  { label: 'Documents', path: '/home/kali/Documents' },
  { label: 'Downloads', path: '/home/kali/Downloads' },
  { label: 'Removable', path: '/media/removable' },
];

interface PlacesMenuProps {
  openApp?: (id: string) => void;
}

const PlacesMenu: React.FC<PlacesMenuProps> = ({ openApp }) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (path: string) => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('file-explorer-path', path);
      }
    } catch {
      // ignore sessionStorage failures
    }
    if (openApp) {
      openApp('file-explorer');
    } else {
      window.dispatchEvent(new CustomEvent('open-app', { detail: 'file-explorer' }));
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
        onClick={() => setOpen((value) => !value)}
      >
        Places
      </button>
      {open && (
        <ul
          className="absolute left-0 mt-1 w-40 bg-ub-grey text-ubt-grey border border-black border-opacity-50 rounded shadow-md z-50"
          onMouseLeave={() => setOpen(false)}
        >
          {DEFAULT_PLACES.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className="w-full text-left px-4 py-1 hover:bg-white hover:bg-opacity-10"
                title={item.path}
                onClick={() => handleSelect(item.path)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlacesMenu;
