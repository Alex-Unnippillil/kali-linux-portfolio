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
            apps: combined,
            unfilteredApps: combined,
            favorites,
            recents,
        });
    }

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
                    onClick={(event) => this.handleToggleFavorite(event, app.id)}
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
                    openApp={() => this.openApp(app.id)}
                    disabled={app.disabled}
                    prefetch={app.screen?.prefetch}
                />
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
        const { apps, favorites, recents } = this.state;
        const favoriteSet = new Set(favorites);
        const appMap = new Map(apps.map((app) => [app.id, app]));
        const favoriteApps = apps.filter((app) => favoriteSet.has(app.id));
        const recentApps = recents
            .map((id) => appMap.get(id))
            .filter(Boolean);
        const seenIds = new Set([...favoriteApps, ...recentApps].map((app) => app.id));
        const remainingApps = apps.filter((app) => !seenIds.has(app.id));
        const groupedApps = chunkApps(remainingApps, GROUP_SIZE);
        const hasResults =
            favoriteApps.length > 0 ||
            recentApps.length > 0 ||
            groupedApps.some((group) => group.length > 0);

        return (
            <div className="fixed inset-0 z-overlay flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <input
                    className="mt-10 mb-8 w-2/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none md:w-1/3"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                    aria-label="Search applications"
                />
                <div className="flex w-full max-w-5xl flex-col items-stretch px-6 pb-10">
                    {this.renderSection('Favorites', favoriteApps)}
                    {this.renderSection('Recent', recentApps)}
                    {groupedApps.map((group, index) =>
                        group.length ? this.renderSection(`Group ${index + 1}`, group) : null
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
}

export default AllApplications;

