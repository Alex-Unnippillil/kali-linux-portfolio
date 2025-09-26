import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

type Place = {
  id: string;
  label: string;
  icon: string;
  appId: string;
};

const PLACES: Place[] = [
  { id: 'home', label: 'Home', icon: '/themes/Yaru/system/user-home.png', appId: 'file-explorer' },
  { id: 'desktop', label: 'Desktop', icon: '/themes/Yaru/system/user-desktop.png', appId: 'file-explorer' },
  { id: 'documents', label: 'Documents', icon: '/themes/Yaru/system/folder.png', appId: 'file-explorer' },
  { id: 'downloads', label: 'Downloads', icon: '/themes/Yaru/system/folder.png', appId: 'file-explorer' },
  { id: 'trash', label: 'Trash', icon: '/themes/Yaru/system/user-trash-full.png', appId: 'trash' },
];

const KaliPlacesMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/system/folder.png"
          alt="Places menu"
          width={16}
          height={16}
          className="inline mr-1"
        />
        Places
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-1 z-50 w-48 bg-ub-grey text-white shadow-lg"
          role="menu"
          tabIndex={-1}
        >
          <ul className="py-2">
            {PLACES.map(place => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-app', { detail: place.appId }));
                    setOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-1 text-left text-sm hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange"
                >
                  <Image
                    src={place.icon}
                    alt={`${place.label} icon`}
                    width={16}
                    height={16}
                    className="mr-2 h-4 w-4"
                  />
                  <span>{place.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default KaliPlacesMenu;
