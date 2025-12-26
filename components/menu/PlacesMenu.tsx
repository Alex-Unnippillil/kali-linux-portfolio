import React from 'react';

export type PlacesMenuItem = {
  id: string;
  label: string;
  icon: string;
  description?: string;
  onSelect?: () => void;
};

export interface PlacesMenuProps {
  heading?: string;
  items: PlacesMenuItem[];
}

const KALI_ICON_MAP: Record<string, string> = {
  // Note: paths are case-sensitive on most hosting targets; keep `Places` aligned with `public/themes/Kali/Places`.
  // Some legacy Kali "Places" icons were locally marked assume-unchanged and hard to stage on Windows; we route to
  // the remaining, shared icons instead.
  home: '/themes/Kali/Places/folder.svg',
  'user-home': '/themes/Kali/Places/folder.svg',
  desktop: '/themes/Kali/Places/folder.svg',
  'user-desktop': '/themes/Kali/Places/folder.svg',
  documents: '/themes/Kali/Places/folder.svg',
  'folder-documents': '/themes/Kali/Places/folder.svg',
  downloads: '/themes/Kali/Places/folder-downloads.svg',
  'folder-downloads': '/themes/Kali/Places/folder-downloads.svg',
  music: '/themes/Kali/Places/folder-music.svg',
  'folder-music': '/themes/Kali/Places/folder-music.svg',
  pictures: '/themes/Kali/Places/folder-pictures.svg',
  'folder-pictures': '/themes/Kali/Places/folder-pictures.svg',
  photos: '/themes/Kali/Places/folder-pictures.svg',
  videos: '/themes/Kali/Places/folder-videos.svg',
  'folder-videos': '/themes/Kali/Places/folder-videos.svg',
  movies: '/themes/Kali/Places/folder-videos.svg',
  trash: '/themes/Kali/Places/user-trash-symbolic.svg',
  'user-trash': '/themes/Kali/Places/user-trash-symbolic.svg',
  'trash-full': '/themes/Kali/Places/user-trash-symbolic.svg',
  'user-trash-full': '/themes/Kali/Places/user-trash-symbolic.svg',
};

const FALLBACK_FLAG = 'data-fallback-applied';
const FALLBACK_SRC = 'data-fallback-src';

const resolveKaliIcon = (id: string): string | undefined => {
  const normalizedId = id.toLowerCase();
  return KALI_ICON_MAP[normalizedId];
};

const PlacesMenu: React.FC<PlacesMenuProps> = ({ heading = 'Places', items }) => {
  return (
    <nav
      aria-label={heading}
      className="flex h-[360px] w-64 select-none flex-col overflow-hidden rounded-lg border border-kali-border bg-kali-menu text-sm text-white shadow-kali-panel"
    >
      <header className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-kali-muted">
        {heading}
      </header>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
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
                  className="group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-150 hover:bg-kali-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
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
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    {item.description ? (
                      <p className="truncate text-xs text-kali-muted/80">{item.description}</p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default PlacesMenu;

export { KALI_ICON_MAP, resolveKaliIcon };
