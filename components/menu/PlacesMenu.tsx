import React, { useMemo } from 'react';

export type PlacesMenuItem = {
  id: string;
  label: string;
  icon: string;
  path?: string;
  onSelect?: () => void;
};

export type PlacesMenuSection = {
  id: string;
  heading: string;
  items: PlacesMenuItem[];
};

export interface PlacesMenuProps {
  heading?: string;
  items?: PlacesMenuItem[];
  sections?: PlacesMenuSection[];
}

const KALI_ICON_MAP: Record<string, string> = {
  home: '/themes/Kali/places/user-home.svg',
  'user-home': '/themes/Kali/places/user-home.svg',
  desktop: '/themes/Kali/places/user-desktop.svg',
  'user-desktop': '/themes/Kali/places/user-desktop.svg',
  documents: '/themes/Kali/places/folder-documents.svg',
  'folder-documents': '/themes/Kali/places/folder-documents.svg',
  downloads: '/themes/Kali/places/folder-downloads.svg',
  'folder-downloads': '/themes/Kali/places/folder-downloads.svg',
  music: '/themes/Kali/places/folder-music.svg',
  'folder-music': '/themes/Kali/places/folder-music.svg',
  pictures: '/themes/Kali/places/folder-pictures.svg',
  'folder-pictures': '/themes/Kali/places/folder-pictures.svg',
  photos: '/themes/Kali/places/folder-pictures.svg',
  videos: '/themes/Kali/places/folder-videos.svg',
  'folder-videos': '/themes/Kali/places/folder-videos.svg',
  movies: '/themes/Kali/places/folder-videos.svg',
  trash: '/themes/Kali/places/user-trash.svg',
  'user-trash': '/themes/Kali/places/user-trash.svg',
  'trash-full': '/themes/Kali/places/user-trash-full.svg',
  'user-trash-full': '/themes/Kali/places/user-trash-full.svg',
  'file-system': '/themes/Kali/Places/folder.svg',
  'removable-media': '/themes/Kali/Places/folder.svg',
  network: '/themes/Kali/panel/network-wireless-signal-good-symbolic.svg',
  'network-servers': '/themes/Kali/panel/network-wireless-signal-none-symbolic.svg',
  'network-shares': '/themes/Kali/panel/network-wireless-signal-good-symbolic.svg',
};

const PERSONAL_ITEMS: PlacesMenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '/themes/Kali/places/user-home.svg',
    path: '/home/kali',
  },
  {
    id: 'desktop',
    label: 'Desktop',
    icon: '/themes/Kali/places/user-desktop.svg',
    path: '/home/kali/Desktop',
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: '/themes/Kali/places/folder-documents.svg',
    path: '/home/kali/Documents',
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: '/themes/Kali/places/folder-downloads.svg',
    path: '/home/kali/Downloads',
  },
  {
    id: 'music',
    label: 'Music',
    icon: '/themes/Kali/places/folder-music.svg',
    path: '/home/kali/Music',
  },
  {
    id: 'pictures',
    label: 'Pictures',
    icon: '/themes/Kali/places/folder-pictures.svg',
    path: '/home/kali/Pictures',
  },
  {
    id: 'videos',
    label: 'Videos',
    icon: '/themes/Kali/places/folder-videos.svg',
    path: '/home/kali/Videos',
  },
];

const DEVICE_ITEMS: PlacesMenuItem[] = [
  {
    id: 'file-system',
    label: 'File System',
    icon: '/themes/Kali/Places/folder.svg',
    path: '/',
  },
  {
    id: 'unsaved',
    label: 'Unsaved Files',
    icon: '/themes/Kali/places/folder-downloads.svg',
    path: '/unsaved',
  },
  {
    id: 'removable-media',
    label: 'Removable Media',
    icon: '/themes/Kali/Places/folder.svg',
    path: '/media/removable',
  },
];

const NETWORK_ITEMS: PlacesMenuItem[] = [
  {
    id: 'network',
    label: 'Browse Network',
    icon: '/themes/Kali/panel/network-wireless-signal-good-symbolic.svg',
    path: '/network',
  },
  {
    id: 'network-servers',
    label: 'SSH Servers',
    icon: '/themes/Kali/panel/network-wireless-signal-none-symbolic.svg',
    path: '/network/ssh',
  },
  {
    id: 'network-shares',
    label: 'Windows Shares',
    icon: '/themes/Kali/panel/network-wireless-signal-good-symbolic.svg',
    path: '/network/windows',
  },
];

export const DEFAULT_PLACES_SECTIONS: PlacesMenuSection[] = [
  { id: 'personal', heading: 'Personal', items: PERSONAL_ITEMS },
  { id: 'devices', heading: 'Devices', items: DEVICE_ITEMS },
  { id: 'network', heading: 'Network', items: NETWORK_ITEMS },
];

export const DEFAULT_PLACES_ITEMS: PlacesMenuItem[] = DEFAULT_PLACES_SECTIONS.flatMap(
  (section) => section.items,
);

const dispatchOpenFilesApp = (path?: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const detail = path
    ? { id: 'file-explorer', path, initialPath: path }
    : { id: 'file-explorer' };
  window.dispatchEvent(new CustomEvent('open-app', { detail }));
};

const FALLBACK_FLAG = 'data-fallback-applied';
const FALLBACK_SRC = 'data-fallback-src';

const resolveKaliIcon = (id: string): string | undefined => {
  const normalizedId = id.toLowerCase();
  return KALI_ICON_MAP[normalizedId];
};

const PlacesMenu: React.FC<PlacesMenuProps> = ({ heading = 'Places', items, sections }) => {
  const resolvedSections = useMemo<PlacesMenuSection[]>(() => {
    if (sections && sections.length) {
      return sections;
    }

    if (items && items.length) {
      return [{ id: 'default', heading, items }];
    }

    return DEFAULT_PLACES_SECTIONS;
  }, [heading, items, sections]);

  return (
    <nav aria-label={heading} className="w-56 select-none text-sm text-white">
      <header className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey">
        {heading}
      </header>
      <div className="space-y-4">
        {resolvedSections.map((section) => (
          <div
            key={section.id}
            role="group"
            aria-label={`${heading} - ${section.heading}`}
            className="space-y-1"
          >
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-ubt-grey">
              {section.heading}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const kaliIcon = resolveKaliIcon(item.id);
                const src = kaliIcon ?? item.icon;

                const activate = () => {
                  dispatchOpenFilesApp(item.path);
                  item.onSelect?.();
                };

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={activate}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          activate();
                        }
                      }}
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
          </div>
        ))}
      </div>
    </nav>

  );
};

export default PlacesMenu;

export {
  DEFAULT_PLACES_ITEMS,
  DEFAULT_PLACES_SECTIONS,
  DEVICE_ITEMS,
  KALI_ICON_MAP,
  NETWORK_ITEMS,
  PERSONAL_ITEMS,
  resolveKaliIcon,
};

