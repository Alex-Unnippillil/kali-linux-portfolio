import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const STORAGE_KEY = 'dragon-menu-category';

const DragonMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('favorites');

  useEffect(() => {
    const last = safeLocalStorage?.getItem(STORAGE_KEY);
    if (last) setCategory(last);
  }, []);

  useEffect(() => {
    safeLocalStorage?.setItem(STORAGE_KEY, category);
  }, [category]);

  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  const categories = [
    { id: 'favorites', label: 'Favorites', apps: favoriteApps },
    { id: 'utilities', label: 'Utilities', apps: utilities as AppMeta[] },
    { id: 'games', label: 'Games', apps: games as AppMeta[] },
  ];

  const current = categories.find(c => c.id === category) ?? categories[0];

  const openApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Applications"
        onClick={() => setOpen(o => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/icons8-kali-linux.svg"
          alt="Menu"
          width={16}
          height={16}
          className="inline"
        />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 z-50 flex bg-ub-grey text-white shadow-lg">
          <div className="flex flex-col bg-gray-800 p-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`text-left px-2 py-1 rounded mb-1 ${category === cat.id ? 'bg-gray-700' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3 grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {current.apps.map(app => (
              <UbuntuApp
                key={app.id}
                id={app.id}
                icon={app.icon}
                name={app.title}
                openApp={() => openApp(app.id)}
                disabled={app.disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DragonMenu;
