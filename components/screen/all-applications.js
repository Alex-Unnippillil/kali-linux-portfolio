import React, { useCallback, useEffect, useMemo, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';
import { useSettings } from '../../hooks/useSettings';

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

const arraysEqual = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

const AllApplications = ({ apps = [], games = [], openApp }) => {
    const { favoriteIds, pinnedIds, setFavoriteIds, setPinnedIds } = useSettings();
    const [query, setQuery] = useState('');
    const [draggingId, setDraggingId] = useState(null);

    const allApps = useMemo(() => {
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        return combined;
    }, [apps, games]);

    const availableIds = useMemo(() => new Set(allApps.map((app) => app.id)), [allApps]);

    const [recentIds, setRecentIds] = useState(() =>
        sanitizeIds(readStoredIds(RECENTS_KEY), availableIds, 10)
    );

    const sanitizedFavorites = useMemo(
        () => favoriteIds.filter((id) => availableIds.has(id)),
        [favoriteIds, availableIds]
    );

    const sanitizedPinned = useMemo(
        () => pinnedIds.filter((id) => availableIds.has(id)),
        [pinnedIds, availableIds]
    );

    useEffect(() => {
        if (favoriteIds.some((id) => !availableIds.has(id))) {
            setFavoriteIds(sanitizeIds(favoriteIds, availableIds));
        }
    }, [favoriteIds, availableIds, setFavoriteIds]);

    useEffect(() => {
        if (pinnedIds.some((id) => !availableIds.has(id))) {
            setPinnedIds(sanitizeIds(pinnedIds, availableIds));
        }
    }, [pinnedIds, availableIds, setPinnedIds]);

    useEffect(() => {
        const stored = sanitizeIds(readStoredIds(RECENTS_KEY), availableIds, 10);
        setRecentIds((prev) => (arraysEqual(prev, stored) ? prev : stored));
        persistIds(RECENTS_KEY, stored);
    }, [availableIds]);

    const filteredApps = useMemo(() => {
        if (!query) return allApps;
        const lower = query.toLowerCase();
        return allApps.filter((app) => app.title.toLowerCase().includes(lower));
    }, [allApps, query]);

    const filteredMap = useMemo(
        () => new Map(filteredApps.map((app) => [app.id, app])),
        [filteredApps]
    );

    const favoriteApps = useMemo(
        () => sanitizedFavorites.map((id) => filteredMap.get(id)).filter(Boolean),
        [sanitizedFavorites, filteredMap]
    );

    const recentApps = useMemo(
        () => recentIds.map((id) => filteredMap.get(id)).filter(Boolean),
        [recentIds, filteredMap]
    );

    const seenIds = useMemo(() => {
        const set = new Set();
        favoriteApps.forEach((app) => set.add(app.id));
        recentApps.forEach((app) => set.add(app.id));
        return set;
    }, [favoriteApps, recentApps]);

    const remainingApps = useMemo(
        () => filteredApps.filter((app) => !seenIds.has(app.id)),
        [filteredApps, seenIds]
    );

    const groupedApps = useMemo(
        () => chunkApps(remainingApps, GROUP_SIZE),
        [remainingApps]
    );

    const favoriteSet = useMemo(() => new Set(sanitizedFavorites), [sanitizedFavorites]);
    const pinnedSet = useMemo(() => new Set(sanitizedPinned), [sanitizedPinned]);

    const handleChange = (e) => {
        setQuery(e.target.value);
    };

    const handleOpenApp = useCallback(
        (id) => {
            setRecentIds((state) => {
                const filtered = state.filter((recentId) => recentId !== id);
                const next = [id, ...filtered].slice(0, 10);
                persistIds(RECENTS_KEY, next);
                return next;
            });
            if (typeof openApp === 'function') {
                openApp(id);
            }
        },
        [openApp]
    );

    const handleFavoriteChange = useCallback(
        (id, nextState) => {
            setFavoriteIds((state) => {
                const has = state.includes(id);
                if (nextState && !has) {
                    return [...state, id];
                }
                if (!nextState && has) {
                    return state.filter((value) => value !== id);
                }
                return state;
            });
        },
        [setFavoriteIds]
    );

    const handlePinChange = useCallback(
        (id, nextState) => {
            setPinnedIds((state) => {
                const has = state.includes(id);
                if (nextState && !has) {
                    return [...state, id];
                }
                if (!nextState && has) {
                    return state.filter((value) => value !== id);
                }
                return state;
            });
        },
        [setPinnedIds]
    );

    const handleToggleFavorite = useCallback(
        (event, id, isFavorite) => {
            event.preventDefault();
            event.stopPropagation();
            handleFavoriteChange(id, !isFavorite);
        },
        [handleFavoriteChange]
    );

    const handleFavoriteDragStart = useCallback(
        (id) => (event) => {
            setDraggingId(id);
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                try {
                    event.dataTransfer.setData('text/plain', id);
                } catch (e) {
                    // ignore data transfer failures
                }
            }
        },
        []
    );

    const handleFavoriteDragOver = useCallback(
        (id) => (event) => {
            if (!draggingId || draggingId === id) return;
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        },
        [draggingId]
    );

    const handleFavoriteDrop = useCallback(
        (id) => (event) => {
            event.preventDefault();
            const sourceId = draggingId || (event.dataTransfer && event.dataTransfer.getData('text/plain'));
            if (!sourceId || sourceId === id) {
                setDraggingId(null);
                return;
            }
            setFavoriteIds((state) => {
                const sourceIndex = state.indexOf(sourceId);
                const targetIndex = state.indexOf(id);
                if (sourceIndex === -1 || targetIndex === -1) return state;
                const next = [...state];
                next.splice(sourceIndex, 1);
                next.splice(targetIndex, 0, sourceId);
                return next;
            });
            setDraggingId(null);
        },
        [draggingId, setFavoriteIds]
    );

    const handleFavoriteDragEnd = useCallback(() => {
        setDraggingId(null);
    }, []);

    const handleFavoritesContainerDragOver = useCallback(
        (event) => {
            if (!draggingId) return;
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        },
        [draggingId]
    );

    const handleFavoritesContainerDrop = useCallback(
        (event) => {
            if (!draggingId) return;
            event.preventDefault();
            const sourceId = draggingId;
            setFavoriteIds((state) => {
                if (!state.includes(sourceId)) return state;
                const next = state.filter((value) => value !== sourceId);
                next.push(sourceId);
                return next;
            });
            setDraggingId(null);
        },
        [draggingId, setFavoriteIds]
    );

    const renderAppTile = (app, { enableDrag = false } = {}) => {
        const isFavorite = favoriteSet.has(app.id);
        const isPinned = pinnedSet.has(app.id);
        const dragHandlers = enableDrag
            ? {
                  onDragStart: handleFavoriteDragStart(app.id),
                  onDragOver: handleFavoriteDragOver(app.id),
                  onDrop: handleFavoriteDrop(app.id),
                  onDragEnd: handleFavoriteDragEnd,
              }
            : {};
        return (
            <div
                key={app.id}
                className={`relative flex w-full justify-center${
                    enableDrag && draggingId === app.id ? ' opacity-70' : ''
                }`}
                {...dragHandlers}
            >
                <button
                    type="button"
                    aria-pressed={isFavorite}
                    aria-label={
                        isFavorite
                            ? `Remove ${app.title} from favorites`
                            : `Add ${app.title} to favorites`
                    }
                    onClick={(event) => handleToggleFavorite(event, app.id, isFavorite)}
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
                    isFavorite={isFavorite}
                    isPinned={isPinned}
                    onToggleFavorite={handleFavoriteChange}
                    onTogglePin={handlePinChange}
                    onOpenNewWindow={() => handleOpenApp(app.id)}
                />
            </div>
        );
    };

    const renderSection = (title, sectionApps, options = {}) => {
        if (!sectionApps.length) return null;
        const enableDrag = options.enableDrag === true;
        return (
            <section key={title} aria-label={`${title} apps`} className="mb-8 w-full">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">
                    {title}
                </h2>
                <div
                    className="grid grid-cols-3 gap-6 place-items-center pb-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
                    onDragOver={enableDrag ? handleFavoritesContainerDragOver : undefined}
                    onDrop={enableDrag ? handleFavoritesContainerDrop : undefined}
                >
                    {sectionApps.map((app) => renderAppTile(app, { enableDrag }))}
                </div>
            </section>
        );
    };

    const hasResults =
        favoriteApps.length > 0 ||
        recentApps.length > 0 ||
        groupedApps.some((group) => group.length > 0);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
            <input
                className="mt-10 mb-8 w-2/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none md:w-1/3"
                placeholder="Search"
                value={query}
                onChange={handleChange}
                aria-label="Search applications"
            />
            <div className="flex w-full max-w-5xl flex-col items-stretch px-6 pb-10">
                {renderSection('Favorites', favoriteApps, { enableDrag: true })}
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
};

export default AllApplications;
