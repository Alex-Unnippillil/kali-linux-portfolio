import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import {
    FAVORITES_KEY,
    RECENTS_KEY,
    arraysEqual,
    persistIds,
    readStoredIds,
    sanitizeIds,
    updateRecentIds,
} from '../../utils/appPreferences';
import { useAppSearch } from '../../hooks/useAppSearch';
import { buildCategoryConfigs } from '../../lib/appCategories';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const GROUP_SIZE = 9;

const chunkApps = (apps, size) => {
    const chunks = [];
    for (let i = 0; i < apps.length; i += size) {
        chunks.push(apps.slice(i, i + size));
    }
    return chunks;
};

const combineAppLists = (apps = [], games = []) => {
    const map = new Map();
    [...apps, ...games].forEach((app) => {
        if (app && typeof app.id === 'string' && !map.has(app.id)) {
            map.set(app.id, app);
        }
    });
    return Array.from(map.values());
};

const buildAvailableIdSet = (apps) => new Set(apps.map((app) => app.id));

const AllApplications = ({ apps = [], games = [], openApp }) => {
    const combinedApps = useMemo(() => combineAppLists(apps, games), [apps, games]);
    const availableIds = useMemo(() => buildAvailableIdSet(combinedApps), [combinedApps]);

    const [favoriteIds, setFavoriteIds] = useState([]);
    const [recentIds, setRecentIds] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const categoryListRef = useRef(null);

    useRovingTabIndex(categoryListRef, true, 'horizontal');

    useEffect(() => {
        const storedFavorites = sanitizeIds(readStoredIds(FAVORITES_KEY), availableIds);
        const storedRecents = sanitizeIds(readStoredIds(RECENTS_KEY), availableIds, 10);
        setFavoriteIds(storedFavorites);
        setRecentIds(storedRecents);
        persistIds(FAVORITES_KEY, storedFavorites);
        persistIds(RECENTS_KEY, storedRecents);
    }, [availableIds]);

    useEffect(() => {
        setFavoriteIds((current) => {
            const sanitized = sanitizeIds(current, availableIds);
            if (!arraysEqual(sanitized, current)) {
                persistIds(FAVORITES_KEY, sanitized);
                return sanitized;
            }
            return current;
        });
        setRecentIds((current) => {
            const sanitized = sanitizeIds(current, availableIds, 10);
            if (!arraysEqual(sanitized, current)) {
                persistIds(RECENTS_KEY, sanitized);
                return sanitized;
            }
            return current;
        });
    }, [availableIds]);

    const { query, setQuery, filtered } = useAppSearch(combinedApps, {
        fuseOptions: { keys: ['title', 'id'] },
    });

    const filteredMap = useMemo(
        () => new Map(filtered.map((app) => [app.id, app])),
        [filtered],
    );

    const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
    const favorites = useMemo(
        () => filtered.filter((app) => favoriteSet.has(app.id)),
        [filtered, favoriteSet],
    );

    const recent = useMemo(
        () =>
            recentIds
                .map((id) => filteredMap.get(id))
                .filter(Boolean),
        [recentIds, filteredMap],
    );

    const categories = useMemo(
        () =>
            buildCategoryConfigs(filtered, {
                favoriteIds,
                recentIds,
            }),
        [filtered, favoriteIds, recentIds],
    );

    useEffect(() => {
        if (!categories.some((category) => category.id === activeCategory)) {
            setActiveCategory(categories[0]?.id ?? 'all');
        }
    }, [categories, activeCategory]);

    const activeCategoryConfig = useMemo(
        () => categories.find((category) => category.id === activeCategory) ?? categories[0],
        [categories, activeCategory],
    );

    const seenIds = useMemo(() => {
        const ids = new Set();
        favorites.forEach((app) => ids.add(app.id));
        recent.forEach((app) => ids.add(app.id));
        return ids;
    }, [favorites, recent]);

    const browsePool = useMemo(() => {
        if (!activeCategoryConfig) return [];
        switch (activeCategoryConfig.type) {
            case 'favorites':
                return favorites;
            case 'recent':
                return recent;
            case 'all':
                return filtered;
            case 'ids':
            default:
                return activeCategoryConfig.apps;
        }
    }, [activeCategoryConfig, favorites, filtered, recent]);

    const browsingApps = useMemo(() => {
        if (!activeCategoryConfig) return [];
        if (activeCategoryConfig.type === 'favorites' || activeCategoryConfig.type === 'recent') {
            return browsePool;
        }
        return browsePool.filter((app) => !seenIds.has(app.id));
    }, [activeCategoryConfig, browsePool, seenIds]);

    const groupedApps = useMemo(
        () => chunkApps(browsingApps, GROUP_SIZE),
        [browsingApps],
    );

    const hasResults =
        favorites.length > 0 ||
        recent.length > 0 ||
        groupedApps.some((group) => group.length > 0);

    const handleOpenApp = useCallback(
        (id) => {
            setRecentIds((current) => {
                const next = updateRecentIds(current, id, 10);
                persistIds(RECENTS_KEY, next);
                return next;
            });
            if (typeof openApp === 'function') {
                openApp(id);
            }
        },
        [openApp],
    );

    const handleToggleFavorite = useCallback((event, id) => {
        event.preventDefault();
        event.stopPropagation();
        setFavoriteIds((current) => {
            const isFavorite = current.includes(id);
            const favorites = isFavorite
                ? current.filter((favId) => favId !== id)
                : [...current, id];
            persistIds(FAVORITES_KEY, favorites);
            return favorites;
        });
    }, []);

    const renderAppTile = useCallback(
        (app) => {
            const isFavorite = favoriteSet.has(app.id);
            return (
                <div key={app.id} className="relative flex w-full justify-center">
                    <button
                        type="button"
                        aria-pressed={isFavorite}
                        aria-label={
                            isFavorite
                                ? `Remove ${app.title} from favorites`
                                : `Add ${app.title} to favorites`
                        }
                        onClick={(event) => handleToggleFavorite(event, app.id)}
                        className={`absolute right-2 top-2 text-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                            isFavorite ? 'text-yellow-300' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        ★
                    </button>
                    <UbuntuApp
                        name={app.title}
                        id={app.id}
                        icon={app.icon}
                        openApp={() => handleOpenApp(app.id)}
                        disabled={app.disabled}
                        prefetch={app.screen?.prefetch}
                    />
                </div>
            );
        },
        [favoriteSet, handleOpenApp, handleToggleFavorite],
    );

    const renderSection = useCallback((title, list) => {
        if (!list.length) return null;
        return (
            <section key={title} aria-label={`${title} apps`} className="mb-8 w-full">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">{title}</h2>
                <div className="grid grid-cols-3 gap-6 place-items-center pb-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {list.map((app) => renderAppTile(app))}
                </div>
            </section>
        );
    }, [renderAppTile]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
            <label htmlFor="all-applications-search" className="sr-only">
                Search applications
            </label>
            <input
                id="all-applications-search"
                className="mt-10 mb-6 w-11/12 max-w-xl rounded bg-black bg-opacity-20 px-4 py-2 text-white focus:outline-none"
                placeholder="Search applications"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search applications"
                type="search"
            />
            <nav className="mb-6 w-full px-6" aria-label="Filter applications by category">
                <div
                    ref={categoryListRef}
                    className="flex flex-wrap justify-center gap-2"
                    role="tablist"
                    aria-label="Application categories"
                >
                    {categories.map((category) => {
                        const isActive = category.id === activeCategory;
                        return (
                            <button
                                key={category.id}
                                type="button"
                                role="tab"
                                tabIndex={isActive ? 0 : -1}
                                aria-selected={isActive}
                                onClick={() => setActiveCategory(category.id)}
                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                                }`}
                            >
                                <span>{category.label}</span>
                                <span className="rounded-full bg-black/30 px-2 text-xs text-white/70">
                                    {category.apps.length}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
            <div className="flex w-full max-w-5xl flex-col items-stretch px-6 pb-10">
                {renderSection('Favorites', favorites)}
                {renderSection('Recent', recent)}
                {groupedApps.map((group, index) =>
                    group.length ? renderSection(`Group ${index + 1}`, group) : null,
                )}
                {!hasResults && (
                    <p className="mt-6 text-center text-sm text-white/70">
                        No applications match your search.
                    </p>
                )}
            </div>
        </div>
    );
};

export default AllApplications;
