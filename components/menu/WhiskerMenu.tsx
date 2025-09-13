import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.868 2.8837C10.5469 2.11168 9.45329 2.11168 9.13219 2.8837L7.3014 7.28547L2.54932 7.66644C1.71586 7.73326 1.37791 8.77337 2.01291 9.31732L5.63349 12.4187L4.52735 17.056C4.33334 17.8693 5.21812 18.5121 5.93167 18.0763L10.0001 15.5913L14.0686 18.0763C14.7821 18.5121 15.6669 17.8693 15.4729 17.056L14.3667 12.4187L17.9873 9.31732C18.6223 8.77337 18.2844 7.73326 17.4509 7.66644L12.6988 7.28547L10.868 2.8837Z"
    />
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM10.75 5C10.75 4.58579 10.4142 4.25 10 4.25C9.58579 4.25 9.25 4.58579 9.25 5V10C9.25 10.4142 9.58579 10.75 10 10.75H14C14.4142 10.75 14.75 10.4142 14.75 10C14.75 9.58579 14.4142 9.25 14 9.25H10.75V5Z"
    />
  </svg>
);

const GridIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4.25 2C3.00736 2 2 3.00736 2 4.25V6.75C2 7.99264 3.00736 9 4.25 9H6.75C7.99264 9 9 7.99264 9 6.75V4.25C9 3.00736 7.99264 2 6.75 2H4.25ZM4.25 11C3.00736 11 2 12.0074 2 13.25V15.75C2 16.9926 3.00736 18 4.25 18H6.75C7.99264 18 9 16.9926 9 15.75V13.25C9 12.0074 7.99264 11 6.75 11H4.25ZM13.25 2C12.0074 2 11 3.00736 11 4.25V6.75C11 7.99264 12.0074 9 13.25 9H15.75C16.9926 9 18 7.99264 18 6.75V4.25C18 3.00736 16.9926 2 15.75 2H13.25ZM13.25 11C12.0074 11 11 12.0074 11 13.25V15.75C11 16.9926 12.0074 18 13.25 18H15.75C16.9926 18 18 16.9926 18 15.75V13.25C18 12.0074 16.9926 11 15.75 11H13.25Z"
    />
  </svg>
);

const WrenchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19 5.5C19 7.98528 16.9853 10 14.5 10C14.4022 10 14.3051 9.99688 14.2088 9.99073C13.3358 9.93497 12.4014 10.1183 11.8414 10.7903L5.81681 18.0198C5.29925 18.6409 4.53256 19 3.7241 19C2.21962 19 1 17.7804 1 16.2759C1 15.4674 1.3591 14.7008 1.98017 14.1832L9.20974 8.15855C9.88173 7.59855 10.065 6.66418 10.0093 5.79122C10.0031 5.69494 10 5.59783 10 5.5C10 3.01472 12.0147 1 14.5 1C14.9823 1 15.4469 1.07588 15.8825 1.21636C16.2067 1.32092 16.2735 1.72672 16.0327 1.9676L13.3398 4.66042C13.2094 4.79088 13.1582 4.98403 13.2292 5.15431C13.5334 5.88351 14.1172 6.46695 14.8466 6.77074C15.0168 6.84163 15.2098 6.79041 15.3402 6.66002L18.0325 3.96772C18.2734 3.72683 18.6792 3.79367 18.7838 4.11791C18.9242 4.55338 19 5.01783 19 5.5ZM4 17C4.55228 17 5 16.5523 5 16C5 15.4477 4.55228 15 4 15C3.44772 15 3 15.4477 3 16C3 16.5523 3.44772 17 4 17Z"
    />
  </svg>
);

const PuzzleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M12 4.46691C12 4.06159 12.2623 3.71616 12.5588 3.43985C12.8348 3.18269 13 2.85581 13 2.5C13 1.67157 12.1046 1 11 1C9.89543 1 9 1.67157 9 2.5C9 2.862 9.17098 3.19406 9.45568 3.45321C9.74658 3.718 10 4.05386 10 4.44722C10 5.00695 9.53506 5.45596 8.97644 5.42075C7.96056 5.35672 6.95522 5.2543 5.96183 5.11495C5.72871 5.08224 5.49377 5.16089 5.32731 5.32734C5.16086 5.4938 5.08221 5.72874 5.11492 5.96186C5.25427 6.95525 5.35669 7.96058 5.42072 8.97646C5.45593 9.53507 5.00693 10 4.44721 10C4.05385 10 3.718 9.74658 3.45322 9.45569C3.19406 9.17099 2.86201 9 2.5 9C1.67157 9 1 9.89543 1 11C1 12.1046 1.67157 13 2.5 13C2.85582 13 3.1827 12.8348 3.43986 12.5588C3.71616 12.2623 4.06159 12 4.4669 12C5.03368 12 5.4925 12.4633 5.47094 13.0297C5.42294 14.2907 5.31585 15.5363 5.1524 16.764C5.09796 17.1729 5.38386 17.5489 5.79236 17.6058C6.84158 17.752 7.90341 17.8584 8.97626 17.9236C9.53523 17.9576 10 17.5082 10 16.9481C10 16.5542 9.74616 16.2179 9.45499 15.9526C9.17071 15.6935 9 15.3617 9 15C9 14.1716 9.89543 13.5 11 13.5C12.1046 13.5 13 14.1716 13 15C13 15.3557 12.8349 15.6826 12.559 15.9397C12.2624 16.2161 12 16.5617 12 16.9671C12 17.5339 12.4632 17.9928 13.0296 17.972C14.3674 17.9229 15.689 17.8097 16.9915 17.6354C17.3267 17.5905 17.5905 17.3268 17.6353 16.9915C17.8097 15.6891 17.9229 14.3674 17.972 13.0296C17.9928 12.4632 17.5339 12 16.9671 12C16.5617 12 16.2161 12.2624 15.9397 12.559C15.6826 12.8349 15.3557 13 15 13C14.1716 13 13.5 12.1046 13.5 11C13.5 9.89543 14.1716 9 15 9C15.3617 9 15.6935 9.17071 15.9526 9.455C16.2179 9.74617 16.5542 10 16.9481 10C17.5081 10 17.9575 9.53524 17.9236 8.97628C17.8584 7.90343 17.752 6.84161 17.6058 5.79239C17.5489 5.38389 17.1728 5.09799 16.764 5.15243C15.5363 5.31588 14.2907 5.42297 13.0297 5.47097C12.4633 5.49253 12 5.0337 12 4.46691Z" />
  </svg>
);

type Category = { id: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };

const CATEGORIES: Category[] = [
  { id: 'favorites', label: 'Favorites', icon: StarIcon },
  { id: 'recent', label: 'Recent', icon: ClockIcon },
  { id: 'all', label: 'All Applications', icon: GridIcon },
  { id: 'utilities', label: 'Utilities', icon: WrenchIcon },
  { id: 'games', label: 'Games', icon: PuzzleIcon },
];

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  const recentApps = useMemo(() => {
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      return ids.map(id => allApps.find(a => a.id === id)).filter(Boolean) as AppMeta[];
    } catch {
      return [];
    }
  }, [allApps, open]);
  const utilityApps: AppMeta[] = utilities as any;
  const gameApps: AppMeta[] = games as any;

  const currentApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favoriteApps;
        break;
      case 'recent':
        list = recentApps;
        break;
      case 'utilities':
        list = utilityApps;
        break;
      case 'games':
        list = gameApps;
        break;
      default:
        list = allApps;
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, query, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query]);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(h => Math.min(h + 1, currentApps.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const app = currentApps[highlight];
        if (app) openSelectedApp(app.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, currentApps, highlight]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt="Menu"
          width={16}
          height={16}
          className="inline mr-1"
        />
        Applications
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-1 z-50 flex bg-ub-grey text-white shadow-lg"
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          <div className="flex flex-col bg-gray-800 p-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  className={`text-left px-2 py-1 rounded mb-1 flex items-center ${category === cat.id ? 'bg-gray-700' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="p-3">
            <input
              className="mb-3 w-64 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {currentApps.map((app, idx) => (
                <div key={app.id} className={idx === highlight ? 'ring-2 ring-ubb-orange' : ''}>
                  <UbuntuApp
                    id={app.id}
                    icon={app.icon}
                    name={app.title}
                    openApp={() => openSelectedApp(app.id)}
                    disabled={app.disabled}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
