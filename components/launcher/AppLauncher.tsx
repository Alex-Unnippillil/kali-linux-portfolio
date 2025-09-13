import React, { useEffect, useMemo, useRef, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';

// Metadata for an app defined in apps.config.js
interface AppMeta {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
];

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen launcher showing applications grouped by category. Users can
 * filter by typing on the keyboard and close the launcher with Escape.
 */
const AppLauncher: React.FC<AppLauncherProps> = ({ open, onClose }) => {
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  const allApps: AppMeta[] = apps as any;
  const favouriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  const utilityApps: AppMeta[] = utilities as any;
  const gameApps: AppMeta[] = games as any;

  const filteredApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favouriteApps;
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
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, filter, allApps, favouriteApps, utilityApps, gameApps]);

  // Close on Escape and build up filter from keyboard typing
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Backspace') {
        setFilter(f => f.slice(0, -1));
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setFilter(f => f + e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Reset filter when category changes or launcher opens
  useEffect(() => {
    if (open) setFilter('');
  }, [open, category]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-60 flex"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="m-auto bg-ub-grey text-white p-4 rounded shadow-lg" role="dialog" aria-modal="true">
        <div className="flex mb-4 space-x-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`px-2 py-1 rounded ${cat.id === category ? 'bg-gray-700' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {filter && <div className="mb-2 text-sm">Filter: {filter}</div>}
        <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto">
          {filteredApps.map(app => (
            <UbuntuApp
              key={app.id}
              id={app.id}
              icon={app.icon}
              name={app.title}
              openApp={() => {
                window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
                onClose();
              }}
              disabled={app.disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppLauncher;
