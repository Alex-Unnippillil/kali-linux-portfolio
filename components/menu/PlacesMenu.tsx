import React from 'react';

import { Icon, type IconName } from '../ui/Icon';

export type PlacesMenuItem = {
  id: string;
  label: string;
  iconName?: IconName;
  icon?: string;
  onSelect?: () => void;
};

export interface PlacesMenuProps {
  heading?: string;
  items: PlacesMenuItem[];
}

const KALI_ICON_MAP: Record<string, IconName> = {
  home: 'user-home',
  'user-home': 'user-home',
  desktop: 'user-desktop',
  'user-desktop': 'user-desktop',
  documents: 'folder-documents',
  'folder-documents': 'folder-documents',
  downloads: 'folder-downloads',
  'folder-downloads': 'folder-downloads',
  music: 'folder-music',
  'folder-music': 'folder-music',
  pictures: 'folder-pictures',
  'folder-pictures': 'folder-pictures',
  photos: 'folder-pictures',
  videos: 'folder-videos',
  'folder-videos': 'folder-videos',
  movies: 'folder-videos',
  trash: 'user-trash',
  'user-trash': 'user-trash',
  'trash-full': 'user-trash-full',
  'user-trash-full': 'user-trash-full',
};

const resolveKaliIcon = (id: string): IconName | undefined => {
  const normalizedId = id.toLowerCase();
  return KALI_ICON_MAP[normalizedId];
};

const PlacesMenu: React.FC<PlacesMenuProps> = ({ heading = 'Places', items }) => {
  return (
    <nav aria-label={heading} className="w-56 select-none text-sm text-white">
      <header className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey">
        {heading}
      </header>
      <ul className="space-y-1">
        {items.map((item) => {
          const kaliIcon = resolveKaliIcon(item.id);
          const iconName = item.iconName ?? kaliIcon;

          const handleClick = () => {
            item.onSelect?.();
          };

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={handleClick}
                className="flex w-full items-center gap-3 rounded px-3 py-2 text-left transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ubb-orange"
              >
                {iconName ? (
                  <Icon name={iconName} size={28} className="h-7 w-7 flex-shrink-0" aria-hidden />
                ) : item.icon ? (
                  <img src={item.icon} alt="" width={28} height={28} className="h-7 w-7 flex-shrink-0" />
                ) : (
                  <span className="h-7 w-7 flex-shrink-0" aria-hidden />
                )}
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>

  );
};

export default PlacesMenu;

export { KALI_ICON_MAP, resolveKaliIcon };

