'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';

import styles from './WhiskerMenu.module.css';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
  defaultCategoryId,
  whiskerApps,
  whiskerCategories,
  type WhiskerAppMeta,
} from '../../modules/apps.config';

export interface WhiskerMenuHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

interface WhiskerMenuProps {
  anchorRef?: React.RefObject<HTMLElement | null>;
  onOpenChange?: (open: boolean) => void;
}

const FAVORITE_STORAGE_KEY = 'whisker:favorites';
const RECENT_STORAGE_KEY = 'recentApps';

const APP_INDEX = new Map(whiskerApps.map((app) => [app.id, app]));
const DEFAULT_FAVORITE_IDS = whiskerApps
  .filter((app) => app.favourite)
  .map((app) => app.id);
const LAUNCHABLE_APPS = whiskerApps.filter((app) => !app.disabled);
const CATEGORY_INDEX = new Map(
  whiskerCategories.map((category) => [category.id, category])
);

const sanitizeIds = (ids: string[]): string[] =>
  Array.from(new Set(ids)).filter((id) => APP_INDEX.has(id));

const readFavoriteStorage = (): string[] | null => {
  if (!safeLocalStorage) return null;
  const stored = safeLocalStorage.getItem(FAVORITE_STORAGE_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return sanitizeIds(parsed as string[]);
    }
  } catch {
    return null;
  }
  return null;
};

const readRecentStorage = (): string[] => {
  if (!safeLocalStorage) return [];
  const stored = safeLocalStorage.getItem(RECENT_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return sanitizeIds(parsed as string[]);
    }
  } catch {
    return [];
  }
  return [];
};

const WhiskerMenu = forwardRef<WhiskerMenuHandle, WhiskerMenuProps>(
  ({ anchorRef, onOpenChange }, ref) => {
    const [open, setOpen] = useState(false);
    const [categoryId, setCategoryId] = useState(defaultCategoryId);
    const [query, setQuery] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
      readFavoriteStorage() ?? DEFAULT_FAVORITE_IDS
    );
    const [recentIds, setRecentIds] = useState<string[]>(() =>
      readRecentStorage()
    );
    const [position, setPosition] = useState<{ left: number; bottom: number }>(
      { left: 18, bottom: 80 }
    );

    const menuRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((value) => !value),
    }));

    useEffect(() => {
      if (typeof onOpenChange === 'function') {
        onOpenChange(open);
      }
    }, [open, onOpenChange]);

    useEffect(() => {
      if (!safeLocalStorage) return;
      const stored = readFavoriteStorage();
      if (stored) {
        setFavoriteIds(stored);
      }
    }, []);

    useEffect(() => {
      if (!safeLocalStorage) return;
      safeLocalStorage.setItem(
        FAVORITE_STORAGE_KEY,
        JSON.stringify(favoriteIds)
      );
    }, [favoriteIds]);

    useEffect(() => {
      if (!safeLocalStorage) return;
      setRecentIds(readRecentStorage());
    }, []);

    useEffect(() => {
      if (!open) {
        setHighlightIndex(0);
        return;
      }
      setCategoryId(defaultCategoryId);
      setQuery('');
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const handleStorage = (event: StorageEvent) => {
        if (event.key && event.key !== RECENT_STORAGE_KEY) return;
        setRecentIds(readRecentStorage());
      };
      const refresh = () => setRecentIds(readRecentStorage());
      refresh();
      window.addEventListener('storage', handleStorage);
      window.addEventListener('focus', refresh);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('focus', refresh);
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const focusId = window.requestAnimationFrame(() => {
        searchRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(focusId);
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const updatePosition = () => {
        const rect = anchorRef?.current?.getBoundingClientRect();
        const width = menuRef.current?.offsetWidth ?? Math.min(720, window.innerWidth - 32);
        const safeWidth = Math.min(width, window.innerWidth - 24);
        const maxLeft = Math.max(12, window.innerWidth - safeWidth - 12);
        const left = rect
          ? Math.min(Math.max(12, rect.left), maxLeft)
          : Math.min(18, maxLeft);
        const bottom = rect
          ? Math.max(16, window.innerHeight - rect.top + 12)
          : Math.max(64, window.innerHeight - 420);
        setPosition({ left, bottom });
      };
      const frame = window.requestAnimationFrame(updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener('resize', updatePosition);
      };
    }, [open, anchorRef]);

    useEffect(() => {
      if (!open) return;
      const handlePointer = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node;
        if (menuRef.current?.contains(target)) return;
        if (anchorRef?.current && anchorRef.current.contains(target as Node))
          return;
        setOpen(false);
      };
      window.addEventListener('mousedown', handlePointer);
      window.addEventListener('touchstart', handlePointer, { passive: true });
      return () => {
        window.removeEventListener('mousedown', handlePointer);
        window.removeEventListener('touchstart', handlePointer);
      };
    }, [open, anchorRef]);

    const favoriteIdSet = useMemo(
      () => new Set(favoriteIds),
      [favoriteIds]
    );

    const favoriteApps = useMemo(() => {
      const items: WhiskerAppMeta[] = [];
      favoriteIds.forEach((id) => {
        const app = APP_INDEX.get(id);
        if (app && !app.disabled) {
          items.push(app);
        }
      });
      return items;
    }, [favoriteIds]);

    const recentApps = useMemo(() => {
      const seen = new Set<string>();
      const items: WhiskerAppMeta[] = [];
      recentIds.forEach((id) => {
        if (seen.has(id)) return;
        const app = APP_INDEX.get(id);
        if (!app || app.disabled) return;
        seen.add(id);
        items.push(app);
      });
      return items;
    }, [recentIds]);

    const categoryApps = useMemo(() => {
      if (query.trim()) return LAUNCHABLE_APPS;
      if (categoryId === 'favorites') return favoriteApps;
      if (categoryId === 'recent') return recentApps;
      if (categoryId === 'all') return LAUNCHABLE_APPS;
      const category = CATEGORY_INDEX.get(categoryId);
      if (!category) return [];
      const items: WhiskerAppMeta[] = [];
      category.appIds.forEach((id) => {
        const app = APP_INDEX.get(id);
        if (app && !app.disabled) {
          items.push(app);
        }
      });
      return items;
    }, [categoryId, favoriteApps, recentApps, query]);

    const displayApps = useMemo(() => {
      const searchTerm = query.trim().toLowerCase();
      if (searchTerm) {
        return LAUNCHABLE_APPS.filter((app) =>
          app.title.toLowerCase().includes(searchTerm) ||
          app.id.toLowerCase().includes(searchTerm)
        ).sort((a, b) => a.title.localeCompare(b.title));
      }
      if (categoryId === 'all') {
        return [...categoryApps].sort((a, b) =>
          a.title.localeCompare(b.title)
        );
      }
      return categoryApps;
    }, [categoryApps, categoryId, query]);

    useEffect(() => {
      if (!open) return;
      setHighlightIndex(0);
    }, [categoryId, query, open]);

    useEffect(() => {
      if (!open) return;
      setHighlightIndex((current) => {
        if (!displayApps.length) return 0;
        return Math.min(current, displayApps.length - 1);
      });
    }, [displayApps.length, open]);

    useEffect(() => {
      if (!open) return;
      const handleKey = (event: KeyboardEvent) => {
        if (!open) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          return;
        }
        if (!displayApps.length) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setHighlightIndex((index) =>
            Math.min(index + 1, displayApps.length - 1)
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setHighlightIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Home') {
          event.preventDefault();
          setHighlightIndex(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          setHighlightIndex(displayApps.length - 1);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          const app = displayApps[highlightIndex];
          if (app) {
            window.dispatchEvent(
              new CustomEvent('open-app', { detail: app.id })
            );
            setOpen(false);
          }
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [open, displayApps, highlightIndex]);

    const activeCategory = CATEGORY_INDEX.get(categoryId);
    const resultsLabel = query.trim()
      ? 'Search results'
      : activeCategory?.label ?? 'Applications';

    const toggleFavorite = (id: string) => {
      setFavoriteIds((prev) => {
        const exists = prev.includes(id);
        if (exists) {
          return prev.filter((item) => item !== id);
        }
        return [id, ...prev.filter((item) => item !== id)];
      });
    };

    const handleLaunch = (id: string) => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
      setOpen(false);
    };

    return (
      <div className={styles.container} aria-hidden={!open}>
        {open && (
          <div
            ref={menuRef}
            className={styles.panel}
            style={{
              left: `${position.left}px`,
              bottom: `${position.bottom}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Application launcher"
          >
            <aside className={styles.sidebar}>
              <div>
                <p className={styles.sectionTitle}>Favorites</p>
                <ul className={styles.favoritesList}>
                  {favoriteApps.map((app) => (
                    <li key={app.id}>
                      <button
                        type="button"
                        className={styles.favoriteButton}
                        onClick={() => handleLaunch(app.id)}
                      >
                        <span className={styles.favoriteIcon}>
                          <Image
                            src={app.icon.replace('./', '/')}
                            alt=""
                            width={26}
                            height={26}
                            sizes="26px"
                          />
                        </span>
                        <span className={styles.favoriteLabel}>{app.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {favoriteApps.length === 0 && (
                  <p className={styles.emptyFavorites}>
                    Pin apps using the star button.
                  </p>
                )}
              </div>
              <p className={styles.footerHint}>
                Press the Super key to open the launcher.
              </p>
            </aside>
            <div className={styles.main}>
              <div className={styles.searchRow}>
                <input
                  ref={searchRef}
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search applications"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search applications"
                />
              </div>
              <div className={styles.body}>
                <nav
                  className={styles.categoryList}
                  aria-label="Application categories"
                >
                  {whiskerCategories.map((category) => {
                    const isActive = category.id === categoryId && !query.trim();
                    return (
                      <button
                        key={category.id}
                        type="button"
                        className={`${styles.categoryButton} ${
                          isActive ? styles.categoryActive : ''
                        }`}
                        onClick={() => {
                          setCategoryId(category.id);
                          setQuery('');
                          setHighlightIndex(0);
                        }}
                      >
                        <span className={styles.categoryIcon}>
                          <Image
                            src={category.icon}
                            alt=""
                            width={22}
                            height={22}
                            sizes="22px"
                          />
                        </span>
                        <span>{category.label}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className={styles.resultsCard}>
                  <div className={styles.resultsHeader}>
                    <span className={styles.resultsTitle}>{resultsLabel}</span>
                    <span className={styles.resultsMeta}>
                      {displayApps.length} app
                      {displayApps.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className={styles.appList} role="list">
                    {displayApps.map((app, index) => {
                      const active = index === highlightIndex;
                      const isFavourite = favoriteIdSet.has(app.id);
                      return (
                        <li key={app.id}>
                          <div
                            className={`${styles.appRow} ${
                              active ? styles.appRowActive : ''
                            }`}
                          >
                            <button
                              type="button"
                              className={styles.appMain}
                              onMouseEnter={() => setHighlightIndex(index)}
                              onFocus={() => setHighlightIndex(index)}
                              onClick={() => handleLaunch(app.id)}
                            >
                              <span className={styles.appIcon}>
                                <Image
                                  src={app.icon.replace('./', '/')}
                                  alt=""
                                  width={32}
                                  height={32}
                                  sizes="32px"
                                />
                              </span>
                              <span className={styles.appLabel}>
                                <span className={styles.appTitle}>{app.title}</span>
                                <span className={styles.appSubtitle}>{app.id}</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              className={`${styles.favoriteToggle} ${
                                isFavourite ? styles.favoriteToggleActive : ''
                              }`}
                              aria-pressed={isFavourite}
                              aria-label={
                                isFavourite
                                  ? `Remove ${app.title} from favorites`
                                  : `Add ${app.title} to favorites`
                              }
                              onFocus={() => setHighlightIndex(index)}
                              onClick={() => toggleFavorite(app.id)}
                            >
                              {isFavourite ? '★' : '☆'}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {displayApps.length === 0 && (
                    <p className={styles.emptyState}>
                      No applications found. Try a different search term.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

WhiskerMenu.displayName = 'WhiskerMenu';

export default WhiskerMenu;

