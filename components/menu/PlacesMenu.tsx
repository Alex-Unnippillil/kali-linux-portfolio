import React from 'react';

export type PlacesMenuItem = {
  id: string;
  label: string;
  icon: string;
  onSelect?: () => void | Promise<void>;
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

const dispatchTrashChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('trash-change'));
  }
};

const isTrashEmptyAction = (id: string) => {
  const normalized = id.toLowerCase();
  return normalized.includes('trash') && normalized.includes('empty');
};

const notifyWhenSettled = (maybePromise: unknown) => {
  if (
    maybePromise &&
    typeof (maybePromise as PromiseLike<unknown>).then === 'function'
  ) {
    const promise = maybePromise as PromiseLike<unknown> & {
      finally?: (onFinally: () => void) => PromiseLike<unknown>;
    };

    if (typeof promise.finally === 'function') {
      promise.finally(dispatchTrashChange);
    } else {
      promise.then(
        () => dispatchTrashChange(),
        error => {
          dispatchTrashChange();
          throw error;
        },
      );
    }
    return true;
  }

  return false;
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
            const result = item.onSelect?.();
            if (!isTrashEmptyAction(item.id)) {
              return;
            }

            if (!notifyWhenSettled(result)) {
              dispatchTrashChange();
            }
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

