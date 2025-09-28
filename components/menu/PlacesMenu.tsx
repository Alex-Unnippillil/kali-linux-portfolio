import React from 'react';

export type PlacesMenuItem = {
  id: string;
  label: string;
  icon: string;
  onSelect?: () => void;
};

export interface PlacesMenuProps {
  heading?: string;
  items: PlacesMenuItem[];
}

const KALI_ICON_MAP: Record<string, string> = {
  home: '/themes/kali/places/user-home.svg',
  'user-home': '/themes/kali/places/user-home.svg',
  desktop: '/themes/kali/places/user-desktop.svg',
  'user-desktop': '/themes/kali/places/user-desktop.svg',
  documents: '/themes/kali/places/folder-documents.svg',
  'folder-documents': '/themes/kali/places/folder-documents.svg',
  downloads: '/themes/kali/places/folder-downloads.svg',
  'folder-downloads': '/themes/kali/places/folder-downloads.svg',
  music: '/themes/kali/places/folder-music.svg',
  'folder-music': '/themes/kali/places/folder-music.svg',
  pictures: '/themes/kali/places/folder-pictures.svg',
  'folder-pictures': '/themes/kali/places/folder-pictures.svg',
  photos: '/themes/kali/places/folder-pictures.svg',
  videos: '/themes/kali/places/folder-videos.svg',
  'folder-videos': '/themes/kali/places/folder-videos.svg',
  movies: '/themes/kali/places/folder-videos.svg',
  trash: '/themes/kali/places/user-trash.svg',
  'user-trash': '/themes/kali/places/user-trash.svg',
  'trash-full': '/themes/kali/places/user-trash-full.svg',
  'user-trash-full': '/themes/kali/places/user-trash-full.svg',
};

const FALLBACK_FLAG = 'data-fallback-applied';
const FALLBACK_SRC = 'data-fallback-src';

const resolveKaliIcon = (id: string): string | undefined => {
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
          const src = kaliIcon ?? item.icon;

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
                <img
                  src={src}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 flex-shrink-0"
                  data-fallback-src={item.icon}
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (target.getAttribute(FALLBACK_FLAG) === 'true') {
                      return;
                    }

                    const fallback = target.getAttribute(FALLBACK_SRC);
                    if (!fallback) {
                      return;
                    }

                    target.setAttribute(FALLBACK_FLAG, 'true');
                    target.src = fallback;
                  }}
                />
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

