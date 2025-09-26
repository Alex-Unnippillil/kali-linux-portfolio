import React, { Dispatch, SetStateAction } from 'react';
import UbuntuApp from '../base/ubuntu_app';

export type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
];

interface ApplicationsMenuProps {
  menuRef: React.RefObject<HTMLDivElement>;
  category: string;
  onCategoryChange: Dispatch<SetStateAction<string>>;
  query: string;
  onQueryChange: Dispatch<SetStateAction<string>>;
  apps: AppMeta[];
  highlight: number;
  onOpenApp: (id: string) => void;
  onBlur: React.FocusEventHandler<HTMLDivElement>;
}

const ApplicationsMenu = ({
  menuRef,
  category,
  onCategoryChange,
  query,
  onQueryChange,
  apps,
  highlight,
  onOpenApp,
  onBlur,
}: ApplicationsMenuProps) => (
  <div
    ref={menuRef}
    className="absolute left-0 mt-1 z-50 flex bg-ub-grey text-white shadow-lg"
    tabIndex={-1}
    onBlur={onBlur}
  >
    <div className="flex flex-col bg-gray-800 p-2">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          className={`text-left px-2 py-1 rounded mb-1 ${
            category === cat.id ? 'bg-gray-700' : ''
          }`}
          onClick={() => onCategoryChange(cat.id)}
        >
          {cat.label}
        </button>
      ))}
    </div>
    <div className="p-3">
      <input
        className="mb-3 w-64 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
        placeholder="Search"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
        autoFocus
      />
      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {apps.map((app, idx) => (
          <div key={app.id} className={idx === highlight ? 'ring-2 ring-ubb-orange' : ''}>
            <UbuntuApp
              id={app.id}
              icon={app.icon}
              name={app.title}
              openApp={() => onOpenApp(app.id)}
              disabled={app.disabled}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ApplicationsMenu;
