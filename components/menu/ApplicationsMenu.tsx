import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

export type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

type ApplicationsMenuProps = {
  anchorRef?: React.RefObject<HTMLElement>;
};

type MenuController = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

let controller: MenuController | null = null;

const setController = (next: MenuController | null) => {
  controller = next;
};

export const openApplicationsMenu = () => {
  controller?.open();
};

export const closeApplicationsMenu = () => {
  controller?.close();
};

export const toggleApplicationsMenu = () => {
  controller?.toggle();
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const readRecentAppIds = (): string[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem('recentApps');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string');
    }
    return [];
  } catch {
    return [];
  }
};

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({ anchorRef }) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CategoryId>('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState({ top: 48, left: 16 });
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const allApps = useMemo(() => apps as unknown as AppMeta[], []);
  const utilityApps = useMemo(() => utilities as unknown as AppMeta[], []);
  const gameApps = useMemo(() => games as unknown as AppMeta[], []);
  const favoriteApps = useMemo(
    () => allApps.filter(app => app.favourite),
    [allApps],
  );

  const recentApps = useMemo(() => {
    if (!open) return [] as AppMeta[];
    const ids = readRecentAppIds();
    if (!ids.length) return [] as AppMeta[];
    const appMap = new Map(allApps.map(app => [app.id, app]));
    return ids
      .map(id => appMap.get(id))
      .filter((value): value is AppMeta => Boolean(value));
  }, [allApps, open]);

  const currentApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favoriteApps;
        break;
      case 'recent':
        list = recentApps;
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
    if (!query) return list;
    const lowered = query.toLowerCase();
    return list.filter(app => app.title.toLowerCase().includes(lowered));
  }, [allApps, favoriteApps, recentApps, utilityApps, gameApps, category, query]);

  const selectByIndex = useCallback(
    (index: number) => {
      if (currentApps.length === 0) {
        setHighlight(0);
        return;
      }
      const nextIndex = Math.max(0, Math.min(index, currentApps.length - 1));
      setHighlight(nextIndex);
    },
    [currentApps.length],
  );

  const openApp = useCallback(
    (id: string) => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
      setOpen(false);
    },
    [],
  );

  useEffect(() => {
    const nextController: MenuController = {
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(prev => !prev),
    };
    setController(nextController);
    return () => setController(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const anchor = anchorRef?.current;
      if (anchor) {
        const rect = anchor.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8 + window.scrollY,
          left: rect.left + window.scrollX,
        });
      } else {
        setPosition({ top: 48, left: 16 });
      }
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        !menuRef.current?.contains(target) &&
        !anchorRef?.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [anchorRef, open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta' && !event.altKey && !event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        setOpen(prev => !prev);
        return;
      }
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectByIndex(highlight + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectByIndex(highlight - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = currentApps[highlight];
        if (item) openApp(item.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, highlight, currentApps, openApp, selectByIndex]);

  useEffect(() => {
    if (!open) return;
    selectByIndex(0);
  }, [category, query, open, selectByIndex]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  const boundedHighlight = Math.min(
    highlight,
    Math.max(currentApps.length - 1, 0),
  );
  const selectedApp = currentApps[boundedHighlight] ?? null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] flex w-[720px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-black/40 bg-[#181d24]/95 text-white shadow-2xl backdrop-blur"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-modal="true"
      aria-label="Applications menu"
    >
      <div className="w-80 min-w-[18rem] border-r border-white/10 bg-white/5 p-4">
        <label htmlFor="applications-menu-search" className="sr-only">
          Search applications
        </label>
        <input
          id="applications-menu-search"
          ref={searchRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search applications"
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search applications"
        />
        <nav
          className="mt-3 flex flex-wrap gap-2"
          aria-label="Application categories"
        >
          {CATEGORIES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                category === item.id
                  ? 'bg-sky-500 text-black shadow'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 max-h-80 overflow-y-auto pr-1">
          {currentApps.length === 0 ? (
            <p className="px-2 py-6 text-sm text-white/70">
              No applications match your filters.
            </p>
          ) : (
            <ul className="space-y-1" role="menu" aria-label="Application list">
              {currentApps.map((app, index) => {
                const isActive = index === boundedHighlight;
                return (
                  <li key={app.id}>
                    <button
                      type="button"
                      onClick={() => selectByIndex(index)}
                      onDoubleClick={() => openApp(app.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                        isActive
                          ? 'bg-sky-500/20 ring-1 ring-sky-500/60'
                          : 'hover:bg-white/10'
                      } ${app.disabled ? 'opacity-60' : ''}`}
                      role="menuitem"
                      aria-disabled={app.disabled || undefined}
                    >
                      <Image
                        src={app.icon.replace('./', '/')}
                        alt={`${app.title} icon`}
                        width={32}
                        height={32}
                        className="h-8 w-8"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium leading-tight">
                          {app.title}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-white/60">
                          {app.disabled ? 'Unavailable' : 'Ready'}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between bg-black/20 p-6">
        {selectedApp ? (
          <>
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src={selectedApp.icon.replace('./', '/')}
                  alt={selectedApp.title}
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
                <div>
                  <h2 className="text-lg font-semibold leading-tight">
                    {selectedApp.title}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    {selectedApp.disabled ? 'Coming soon' : 'Simulation'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                Launch the {selectedApp.title} desktop simulation. Double-click
                the item or use the Open button below to add it to your
                workspace.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                onClick={() => selectedApp && openApp(selectedApp.id)}
                disabled={selectedApp.disabled}
              >
                Open
              </button>
              <button
                type="button"
                className="rounded-md border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm text-white/70">
            <p>Select an application to see more details and launch it.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsMenu;
