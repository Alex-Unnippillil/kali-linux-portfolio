import React from 'react';

export type PlacesMenuItem = {
  id: string;
  label: string;
  icon: string;
  onSelect?: () => void;
  section?: string;
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
  const sectionOrder = new Map<string, number>();
  const sections = items.reduce<
    Array<{
      key: string;
      label?: string;
      items: PlacesMenuItem[];
    }>
  >((accumulator, item) => {
    const sectionLabel = item.section?.trim();
    const normalizedKey = sectionLabel ? sectionLabel.toLowerCase() : '__default__';

    if (!sectionOrder.has(normalizedKey)) {
      sectionOrder.set(normalizedKey, accumulator.length);
      accumulator.push({
        key: normalizedKey,
        label: sectionLabel || undefined,
        items: [],
      });
    }

    const sectionIndex = sectionOrder.get(normalizedKey);
    if (sectionIndex !== undefined) {
      accumulator[sectionIndex].items.push(item);
    }

    return accumulator;
  }, []);

  return (
    <nav aria-label={heading} className="w-full max-w-[14rem] select-none text-sm text-white">
      <header className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-ubt-grey">
        {heading}
      </header>
      <ul className="flex max-h-96 list-none flex-col overflow-y-auto pr-1">
        {sections.map((section, sectionIndex) => (
          <React.Fragment key={section.key || `section-${sectionIndex}`}>
            {section.label ? (
              <li
                className={[
                  'sticky top-0 z-10 bg-gray-900 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-ubt-grey first:mt-0',
                  sectionIndex > 0 ? 'mt-2 border-t border-gray-800 pt-2' : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {section.label}
              </li>
            ) : null}
            {section.items.map((item, itemIndex) => {
              const kaliIcon = resolveKaliIcon(item.id);
              const src = kaliIcon ?? item.icon;

              const handleClick = () => {
                item.onSelect?.();
              };

              return (
                <li
                  key={item.id}
                  className={sectionIndex === 0 && itemIndex === 0 && !section.label ? 'mt-0' : 'mt-1'}
                >
                  <button
                    type="button"
                    onClick={handleClick}
                    className="flex h-11 w-full flex-nowrap items-center gap-3 rounded px-3 text-left transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ubb-orange"
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
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </React.Fragment>
        ))}
      </ul>
    </nav>
  );
};

export default PlacesMenu;

export { KALI_ICON_MAP, resolveKaliIcon };

