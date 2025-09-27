import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';
import useFocusTrap from '../../hooks/useFocusTrap';

const FAVORITES_KEY = 'launcherFavorites';
const RECENTS_KEY = 'recentApps';
const GROUP_SIZE = 9;

const readStoredIds = (key) => {
    if (!safeLocalStorage) return [];
    try {
        const raw = JSON.parse(safeLocalStorage.getItem(key) || '[]');
        if (Array.isArray(raw)) {
            return raw.filter((id) => typeof id === 'string');
        }
    } catch (e) {
        // ignore malformed storage entries
    }
    return [];
};

const persistIds = (key, ids) => {
    if (!safeLocalStorage) return;
    try {
        safeLocalStorage.setItem(key, JSON.stringify(ids));
    } catch (e) {
        // ignore quota errors
    }
};

const sanitizeIds = (ids, availableIds, limit) => {
    const unique = [];
    const seen = new Set();
    ids.forEach((id) => {
        if (!availableIds.has(id) || seen.has(id)) return;
        seen.add(id);
        unique.push(id);
    });
    if (typeof limit === 'number') {
        return unique.slice(0, limit);
    }
    return unique;
};

const chunkApps = (apps, size) => {
    const chunks = [];
    for (let i = 0; i < apps.length; i += size) {
        chunks.push(apps.slice(i, i + size));
    }
    return chunks;
};

const buildAppMap = (apps) => new Map(apps.map((app) => [app.id, app]));

function AllApplications({ apps = [], games = [], openApp, onClose }) {
    const [query, setQuery] = useState('');
    const [favorites, setFavorites] = useState([]);
    const [recents, setRecents] = useState([]);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    const combinedApps = useMemo(() => {
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        return combined;
    }, [apps, games]);

    useEffect(() => {
        const availableIds = new Set(combinedApps.map((app) => app.id));
        const storedFavorites = sanitizeIds(readStoredIds(FAVORITES_KEY), availableIds);
        const storedRecents = sanitizeIds(readStoredIds(RECENTS_KEY), availableIds, 10);
        persistIds(FAVORITES_KEY, storedFavorites);
        persistIds(RECENTS_KEY, storedRecents);
        setFavorites(storedFavorites);
        setRecents(storedRecents);
    }, [combinedApps]);

    const filteredApps = useMemo(() => {
        if (!query) return combinedApps;
        const lower = query.toLowerCase();
        return combinedApps.filter((app) => app.title.toLowerCase().includes(lower));
    }, [combinedApps, query]);

    const favoriteApps = useMemo(() => {
        const set = new Set(favorites);
        return filteredApps.filter((app) => set.has(app.id));
    }, [filteredApps, favorites]);

    const appMap = useMemo(() => buildAppMap(filteredApps), [filteredApps]);

    const recentApps = useMemo(
        () =>
            recents
                .map((id) => appMap.get(id))
                .filter(Boolean),
        [recents, appMap],
    );

    const remainingApps = useMemo(() => {
        const seen = new Set([...favoriteApps, ...recentApps].map((app) => app.id));
        return filteredApps.filter((app) => !seen.has(app.id));
    }, [favoriteApps, recentApps, filteredApps]);

    const groupedApps = useMemo(() => chunkApps(remainingApps, GROUP_SIZE), [remainingApps]);

    const handleChange = useCallback((event) => {
        setQuery(event.target.value);
    }, []);

    const handleOpenApp = useCallback(
        (id) => {
            setRecents((state) => {
                const filtered = state.filter((recentId) => recentId !== id);
                const next = [id, ...filtered].slice(0, 10);
                persistIds(RECENTS_KEY, next);
                return next;
            });
            if (typeof openApp === 'function') {
                openApp(id);
            }
            if (typeof onClose === 'function') {
                onClose();
            }
        },
        [openApp, onClose],
    );

    const handleToggleFavorite = useCallback((event, id) => {
        event.preventDefault();
        event.stopPropagation();
        setFavorites((state) => {
            const isFavorite = state.includes(id);
            const next = isFavorite ? state.filter((favId) => favId !== id) : [...state, id];
            persistIds(FAVORITES_KEY, next);
            return next;
        });
    }, []);

    const hasResults =
        favoriteApps.length > 0 ||
        recentApps.length > 0 ||
        groupedApps.some((group) => group.length > 0);

    const handleEscape = useCallback(() => {
        if (typeof onClose === 'function') {
            onClose();
        }
    }, [onClose]);

    useFocusTrap(true, containerRef, {
        initialFocusRef: searchInputRef,
        onEscape: handleEscape,
    });

    const renderAppTile = (app) => {
        const isFavorite = favorites.includes(app.id);
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
    };

    const renderSection = (title, appList) => {
        if (!appList.length) return null;
        return (
            <section key={title} aria-label={`${title} apps`} className="mb-8 w-full">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">
                    {title}
                </h2>
                <div className="grid grid-cols-3 gap-6 place-items-center pb-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {appList.map((app) => renderAppTile(app))}
                </div>
            </section>
        );
    };

    return (
        <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-applications-title"
            className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim"
            tabIndex={-1}
        >
            <header className="mt-8 mb-4 flex w-full max-w-5xl items-center justify-between px-6">
                <h1 id="all-applications-title" className="text-xl font-semibold text-white">
                    Applications
                </h1>
                <button
                    type="button"
                    onClick={handleEscape}
                    className="rounded bg-black bg-opacity-30 px-3 py-1 text-sm text-white transition hover:bg-opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Close launcher"
                >
                    Close
                </button>
            </header>
            <input
                ref={searchInputRef}
                className="mb-8 w-2/3 rounded bg-black bg-opacity-20 px-4 py-2 text-white focus:outline-none md:w-1/3"
                placeholder="Search"
                value={query}
                onChange={handleChange}
                aria-label="Search applications"
            />
            <div className="flex w-full max-w-5xl flex-col items-stretch px-6 pb-10">
                {renderSection('Favorites', favoriteApps)}
                {renderSection('Recent', recentApps)}
                {groupedApps.map((group, index) =>
                    group.length ? renderSection(`Group ${index + 1}`, group) : null
                )}
                {!hasResults && (
                    <p className="mt-6 text-center text-sm text-white/70">
                        No applications match your search.
                    </p>
                )}
            </div>
        </div>
    );
}

export default AllApplications;
