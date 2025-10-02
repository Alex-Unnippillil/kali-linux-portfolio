import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';

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

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            favorites: [],
            recents: [],
            showHidden: false,
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        const availableIds = new Set(combined.map((app) => app.id));
        const favorites = sanitizeIds(readStoredIds(FAVORITES_KEY), availableIds);
        const recents = sanitizeIds(readStoredIds(RECENTS_KEY), availableIds, 10);

        persistIds(FAVORITES_KEY, favorites);
        persistIds(RECENTS_KEY, recents);

        this.setState({
            favorites,
            recents,
        }, () => {
            this.refreshAppLists();
        });
    }

    componentDidUpdate(prevProps, prevState) {
        if (
            prevProps.apps !== this.props.apps ||
            prevProps.games !== this.props.games ||
            prevProps.hiddenApps !== this.props.hiddenApps ||
            prevState.showHidden !== this.state.showHidden ||
            prevState.favorites !== this.state.favorites ||
            prevState.recents !== this.state.recents
        ) {
            this.refreshAppLists();
        }
    }

    areAppListsEqual = (next = [], prev = []) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
            const a = next[index];
            const b = prev[index];
            if (!b || a.id !== b.id || !!a.isHidden !== !!b.isHidden) {
                return false;
            }
        }
        return true;
    };

    areArraysEqual = (next = [], prev = []) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
            if (next[index] !== prev[index]) {
                return false;
            }
        }
        return true;
    };

    refreshAppLists = () => {
        const { apps = [], games = [], hiddenApps = [] } = this.props;
        const hiddenSet = new Set(Array.isArray(hiddenApps) ? hiddenApps : []);

        const combinedMap = new Map();
        apps.forEach((app) => {
            if (!app || typeof app.id !== 'string') return;
            if (combinedMap.has(app.id)) return;
            combinedMap.set(app.id, { ...app, isHidden: hiddenSet.has(app.id) });
        });
        games.forEach((game) => {
            if (!game || typeof game.id !== 'string') return;
            if (combinedMap.has(game.id)) return;
            combinedMap.set(game.id, { ...game, isHidden: hiddenSet.has(game.id) });
        });

        const allApps = Array.from(combinedMap.values());
        const availableIds = new Set(allApps.map((app) => app.id));
        const favorites = sanitizeIds(this.state.favorites, availableIds);
        const recents = sanitizeIds(this.state.recents, availableIds, 10);

        if (!this.areArraysEqual(favorites, this.state.favorites)) {
            persistIds(FAVORITES_KEY, favorites);
        }
        if (!this.areArraysEqual(recents, this.state.recents)) {
            persistIds(RECENTS_KEY, recents);
        }

        const baseList = this.state.showHidden
            ? allApps
            : allApps.filter((app) => !app.isHidden);

        const query = this.state.query || '';
        const normalizedQuery = query.toLowerCase();
        const filtered = normalizedQuery
            ? baseList.filter((app) => app.title.toLowerCase().includes(normalizedQuery))
            : baseList;

        if (
            this.areAppListsEqual(filtered, this.state.apps) &&
            this.areAppListsEqual(baseList, this.state.unfilteredApps) &&
            this.areArraysEqual(favorites, this.state.favorites) &&
            this.areArraysEqual(recents, this.state.recents)
        ) {
            return;
        }

        this.setState({
            apps: filtered,
            unfilteredApps: baseList,
            favorites,
            recents,
        });
    };

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredApps } = this.state;
        const apps =
            value === '' || value === null
                ? unfilteredApps
                : unfilteredApps.filter((app) =>
                      app.title.toLowerCase().includes(value.toLowerCase())
                  );
        this.setState({ query: value, apps });
    };

    handleShowHiddenToggle = (event) => {
        const checked = event?.target?.checked;
        this.setState({ showHidden: Boolean(checked) }, () => {
            this.refreshAppLists();
        });
    };

    handleRestore = (event, id) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof this.props.onRestoreApp === 'function') {
            this.props.onRestoreApp(id);
        }
    };

    openApp = (id) => {
        this.setState((state) => {
            const filtered = state.recents.filter((recentId) => recentId !== id);
            const next = [id, ...filtered].slice(0, 10);
            persistIds(RECENTS_KEY, next);
            return { recents: next };
        }, () => {
            if (typeof this.props.openApp === 'function') {
                this.props.openApp(id);
            }
        });
    };

    handleToggleFavorite = (event, id) => {
        event.preventDefault();
        event.stopPropagation();
        this.setState((state) => {
            const isFavorite = state.favorites.includes(id);
            const favorites = isFavorite
                ? state.favorites.filter((favId) => favId !== id)
                : [...state.favorites, id];
            persistIds(FAVORITES_KEY, favorites);
            return { favorites };
        });
    };

    renderAppTile = (app) => {
        const isFavorite = this.state.favorites.includes(app.id);
        const isHidden = Boolean(app.isHidden);
        const disableApp = app.disabled || isHidden;
        return (
            <div
                key={app.id}
                className={`relative flex w-full justify-center ${isHidden ? 'opacity-70' : ''}`}
                data-hidden={isHidden ? 'true' : 'false'}
            >
                <button
                    type="button"
                    aria-pressed={isFavorite}
                    aria-label={
                        isFavorite
                            ? `Remove ${app.title} from favorites`
                            : `Add ${app.title} to favorites`
                    }
                    onClick={(event) => this.handleToggleFavorite(event, app.id)}
                    disabled={isHidden}
                    className={`absolute right-2 top-2 text-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        isFavorite ? 'text-yellow-300' : 'text-white/60 hover:text-white'
                    } ${isHidden ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                    ★
                </button>
                {isHidden && (
                    <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[0.55rem] uppercase tracking-wide text-white">
                        Hidden
                    </span>
                )}
                <UbuntuApp
                    name={app.title}
                    id={app.id}
                    icon={app.icon}
                    openApp={() => this.openApp(app.id)}
                    disabled={disableApp}
                    prefetch={app.screen?.prefetch}
                />
                {isHidden && this.state.showHidden && (
                    <div className="absolute inset-x-0 bottom-2 flex justify-center">
                        <button
                            type="button"
                            onClick={(event) => this.handleRestore(event, app.id)}
                            className="rounded bg-black/70 px-2 py-1 text-[0.65rem] text-white transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        >
                            Restore
                        </button>
                    </div>
                )}
            </div>
        );
    };

    renderSection = (title, apps) => {
        if (!apps.length) return null;
        return (
            <section key={title} aria-label={`${title} apps`} className="mb-8 w-full">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">
                    {title}
                </h2>
                <div className="grid grid-cols-3 gap-6 place-items-center pb-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {apps.map((app) => this.renderAppTile(app))}
                </div>
            </section>
        );
    };

    render() {
        const { apps, favorites, recents, showHidden } = this.state;
        const favoriteSet = new Set(favorites);
        const visibleApps = apps.filter((app) => !app.isHidden);
        const hiddenAppsList = showHidden ? apps.filter((app) => app.isHidden) : [];
        const appMap = new Map(visibleApps.map((app) => [app.id, app]));
        const favoriteApps = visibleApps.filter((app) => favoriteSet.has(app.id));
        const recentApps = recents
            .map((id) => appMap.get(id))
            .filter(Boolean);
        const seenIds = new Set([...favoriteApps, ...recentApps].map((app) => app.id));
        const remainingApps = visibleApps.filter((app) => !seenIds.has(app.id));
        const groupedApps = chunkApps(remainingApps, GROUP_SIZE);
        const hasResults =
            favoriteApps.length > 0 ||
            recentApps.length > 0 ||
            groupedApps.some((group) => group.length > 0) ||
            hiddenAppsList.length > 0;

        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <input
                    className="mt-10 mb-8 w-2/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none md:w-1/3"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                    aria-label="Search applications"
                />
                <div className="mb-6 flex w-2/3 flex-col items-start gap-2 text-xs text-white/70 md:w-1/3 md:flex-row md:items-center md:justify-between md:text-sm">
                    <div className="flex items-center gap-2">
                        <input
                            id="show-hidden-apps-toggle"
                            type="checkbox"
                            checked={showHidden}
                            onChange={this.handleShowHiddenToggle}
                            className="h-4 w-4 rounded border border-white/40 bg-black/30"
                            aria-labelledby="show-hidden-apps-label"
                        />
                        <label id="show-hidden-apps-label" htmlFor="show-hidden-apps-toggle" className="cursor-pointer">
                            Show hidden apps
                        </label>
                    </div>
                    {showHidden && (
                        <span className="text-[0.7rem] text-white/50 md:text-xs">
                            Hidden apps stay disabled until restored.
                        </span>
                    )}
                </div>
                <div className="flex w-full max-w-5xl flex-col items-stretch px-6 pb-10">
                    {this.renderSection('Favorites', favoriteApps)}
                    {this.renderSection('Recent', recentApps)}
                    {groupedApps.map((group, index) =>
                        group.length ? this.renderSection(`Group ${index + 1}`, group) : null
                    )}
                    {showHidden && hiddenAppsList.length > 0 && this.renderSection('Hidden', hiddenAppsList)}
                    {!hasResults && (
                        <p className="mt-6 text-center text-sm text-white/70">
                            No applications match your search.
                        </p>
                    )}
                </div>
            </div>
        );
    }
}

export default AllApplications;

