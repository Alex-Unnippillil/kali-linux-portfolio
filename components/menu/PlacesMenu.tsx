import React, { useCallback, useEffect, useMemo, useRef } from 'react';

export type PlacesMenuAction = {
  id: string;
  label: string;
  hint?: string;
  onSelect?: () => void;
};

export type PlacesMenuOpenInNewWindow = {
  id?: string;
  label?: string;
  hint?: string;
  onSelect?: () => void;
};

export type PlacesMenuSeparator = {
  id: string;
  type: 'separator';
};

export type PlacesMenuLocationItem = {
  id: string;
  label: string;
  icon: string;
  onSelect?: () => void;
  hint?: string;
  actions?: PlacesMenuAction[];
  openInNewWindow?: PlacesMenuOpenInNewWindow;
  path?: readonly string[];
  isCurrent?: boolean;
  type?: 'item';
};

export type PlacesMenuItem = PlacesMenuLocationItem | PlacesMenuSeparator;

export interface PlacesMenuProps {
  heading?: string;
  items: PlacesMenuItem[];
  currentPath?: readonly string[];
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

const normalizeSegment = (segment: string) => segment.trim().toLowerCase();

const isSeparatorItem = (item: PlacesMenuItem): item is PlacesMenuSeparator =>
  'type' in item && item.type === 'separator';

type PreparedAction =
  | {
      id: string;
      label: string;
      hint?: string;
      onSelect?: () => void;
      kind: 'primary';
      icon: string;
      fallbackIcon: string;
      isCurrent: boolean;
    }
  | {
      id: string;
      label: string;
      hint?: string;
      onSelect?: () => void;
      kind: 'openInNewWindow' | 'action';
    };

type PreparedMenuItem =
  | { type: 'separator'; id: string }
  | {
      type: 'item';
      id: string;
      label: string;
      actions: PreparedAction[];
    };

const TYPEAHEAD_RESET_DELAY = 500;

const PlacesMenu: React.FC<PlacesMenuProps> = ({ heading = 'Places', items, currentPath }) => {
  const interactiveRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeaheadBuffer = useRef('');
  const typeaheadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedCurrentPath = useMemo(() => currentPath?.map(normalizeSegment).filter(Boolean), [currentPath]);

  const preparedItems = useMemo<PreparedMenuItem[]>(() => {
    const normalizePath = (segments?: readonly string[]) => segments?.map(normalizeSegment).filter(Boolean);

    return items.map((item) => {
      if (isSeparatorItem(item)) {
        return { type: 'separator', id: item.id } as const;
      }

      const kaliIcon = resolveKaliIcon(item.id);
      const iconSrc = kaliIcon ?? item.icon;
      const normalizedItemPath = normalizePath(item.path);
      const isCurrent =
        item.isCurrent ??
        (normalizedCurrentPath && normalizedItemPath
          ? normalizedCurrentPath.length === normalizedItemPath.length &&
            normalizedCurrentPath.every((segment, index) => segment === normalizedItemPath[index])
          : false);

      const actions: PreparedAction[] = [
        {
          id: item.id,
          label: item.label,
          hint: item.hint,
          onSelect: item.onSelect,
          kind: 'primary',
          icon: iconSrc,
          fallbackIcon: item.icon,
          isCurrent,
        },
      ];

      if (item.openInNewWindow) {
        const { id, label, hint, onSelect } = item.openInNewWindow;
        actions.push({
          id: id ?? `${item.id}-open-in-new-window`,
          label: label ?? 'Open in new window',
          hint: hint ?? 'Shift+Enter',
          onSelect,
          kind: 'openInNewWindow',
        });
      }

      item.actions?.forEach((action) => {
        actions.push({
          ...action,
          kind: 'action',
        });
      });

      return {
        type: 'item',
        id: item.id,
        label: item.label,
        actions,
      } as const;
    });
  }, [items, normalizedCurrentPath]);

  const focusableTargets = useMemo(() => {
    const labels: string[] = [];
    preparedItems.forEach((item) => {
      if (item.type === 'separator') {
        return;
      }
      item.actions.forEach((action) => {
        labels.push(action.label.toLowerCase());
      });
    });
    return labels;
  }, [preparedItems]);

  useEffect(() => {
    return () => {
      if (typeaheadTimeout.current) {
        clearTimeout(typeaheadTimeout.current);
      }
    };
  }, []);

  const scheduleTypeaheadReset = useCallback(() => {
    if (typeaheadTimeout.current) {
      clearTimeout(typeaheadTimeout.current);
    }
    typeaheadTimeout.current = setTimeout(() => {
      typeaheadBuffer.current = '';
      typeaheadTimeout.current = null;
    }, TYPEAHEAD_RESET_DELAY);
  }, []);

  const handleTypeahead = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const character = event.key.toLowerCase();

      if (!character.trim()) {
        return;
      }

      event.preventDefault();

      let nextBuffer = `${typeaheadBuffer.current}${character}`;
      let matchIndex = focusableTargets.findIndex((label) => label.startsWith(nextBuffer));

      if (matchIndex === -1) {
        nextBuffer = character;
        matchIndex = focusableTargets.findIndex((label) => label.startsWith(nextBuffer));
      }

      typeaheadBuffer.current = nextBuffer;

      if (matchIndex !== -1) {
        const target = interactiveRefs.current[matchIndex];
        target?.focus();
      }

      scheduleTypeaheadReset();
    },
    [focusableTargets, scheduleTypeaheadReset],
  );

  const renderActionButton = useCallback(
    (action: PreparedAction, index: number) => {
      const baseClasses =
        'flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ubb-orange';
      const isPrimary = action.kind === 'primary';
      const isCurrent = isPrimary ? action.isCurrent : false;
      const visualClasses = isPrimary
        ? `${baseClasses} ${isCurrent ? 'bg-gray-700 text-white' : 'bg-transparent hover:bg-gray-700/70'}`
        : `${baseClasses} bg-transparent hover:bg-gray-700/50`;

      const setRef = (element: HTMLButtonElement | null) => {
        interactiveRefs.current[index] = element;
      };

      const handleClick = () => {
        action.onSelect?.();
      };

      return (
        <button
          key={action.id}
          type="button"
          ref={setRef}
          role="menuitem"
          className={visualClasses}
          onClick={handleClick}
          aria-current={isPrimary && isCurrent ? 'page' : undefined}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            {isPrimary ? (
              <img
                src={action.icon}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 flex-shrink-0"
                data-fallback-src={action.fallbackIcon}
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
            ) : (
              <span aria-hidden="true" className="h-7 w-7 flex-shrink-0" />
            )}
            <span className="truncate">{action.label}</span>
          </span>
          {action.hint ? <span className="text-xs text-ubt-grey">{action.hint}</span> : null}
        </button>
      );
    },
    [],
  );

  let focusableIndex = -1;

  return (
    <nav aria-label={heading} className="w-56 select-none text-sm text-white">
      <header className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ubt-grey">{heading}</header>
      {currentPath && currentPath.length ? (
        <div className="px-3 pb-3 text-xs text-ubt-grey" aria-label="Current path">
          <div className="flex flex-wrap items-center gap-1">
            {currentPath.map((segment, index) => (
              <React.Fragment key={`${segment}-${index}`}>
                <span className="font-semibold text-white">{segment}</span>
                {index < currentPath.length - 1 ? (
                  <span aria-hidden="true" role="separator" className="text-ubt-grey">
                    /
                  </span>
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : null}
      <ul className="space-y-1" role="menu" aria-orientation="vertical" onKeyDown={handleTypeahead}>
        {preparedItems.map((item) => {
          if (item.type === 'separator') {
            return <li key={item.id} role="separator" aria-hidden="true" className="mx-3 border-t border-white/10" />;
          }

          return (
            <React.Fragment key={item.id}>
              {item.actions.map((action) => {
                focusableIndex += 1;
                const currentIndex = focusableIndex;
                return (
                  <li key={`${item.id}-${action.id}`} role="none">
                    {renderActionButton(action, currentIndex)}
                  </li>
                );
              })}
            </React.Fragment>
          );
        })}
      </ul>
    </nav>
  );
};

export default PlacesMenu;

export { KALI_ICON_MAP, resolveKaliIcon };

