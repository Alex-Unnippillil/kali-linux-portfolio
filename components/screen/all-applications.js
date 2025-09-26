import React from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
    addRecentApp,
    clearRecentEntries,
    readRecentEntries,
} from '../../utils/recentStorage';

const FAVORITES_KEY = 'launcherFavorites';
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

const RELATIVE_TIME_FORMATTER =
    typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function'
        ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
        : null;

const formatAbsoluteTime = (timestamp) => {
    try {
        return new Date(timestamp).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch (error) {
        return new Date(timestamp).toISOString();
    }
};

const formatRelativeTime = (timestamp) => {
    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
        return '';
    }
    const now = Date.now();
    const diff = timestamp - now;
    const abs = Math.abs(diff);

    if (abs < 5000) {
        return 'just now';
    }

    const units = [
        { limit: 60 * 1000, divisor: 1000, unit: 'second' },
        { limit: 60 * 60 * 1000, divisor: 60 * 1000, unit: 'minute' },
        { limit: 24 * 60 * 60 * 1000, divisor: 60 * 60 * 1000, unit: 'hour' },
        { limit: 7 * 24 * 60 * 60 * 1000, divisor: 24 * 60 * 60 * 1000, unit: 'day' },
        { limit: 30 * 24 * 60 * 60 * 1000, divisor: 7 * 24 * 60 * 60 * 1000, unit: 'week' },
        { limit: 365 * 24 * 60 * 60 * 1000, divisor: 30 * 24 * 60 * 60 * 1000, unit: 'month' },
    ];

    for (const { limit, divisor, unit } of units) {
        if (abs < limit) {
            const value = Math.round(diff / divisor);
            if (RELATIVE_TIME_FORMATTER) {
                return RELATIVE_TIME_FORMATTER.format(value, unit);
            }
            const magnitude = Math.abs(value);
            const label = `${magnitude} ${unit}${magnitude === 1 ? '' : 's'}`;
            return value <= 0 ? `${label} ago` : `in ${label}`;
        }
    }

    const years = Math.round(diff / (365 * 24 * 60 * 60 * 1000));
    if (RELATIVE_TIME_FORMATTER) {
        return RELATIVE_TIME_FORMATTER.format(years, 'year');
    }
    const magnitude = Math.abs(years);
    const label = `${magnitude} year${magnitude === 1 ? '' : 's'}`;
    return years <= 0 ? `${label} ago` : `in ${label}`;
};

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            favorites: [],
            recentEntries: [],
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
        const recentEntries = readRecentEntries()
            .filter((entry) => entry.type === 'app' && availableIds.has(entry.id))
            .slice(0, 10);

        persistIds(FAVORITES_KEY, favorites);

        this.setState({
            apps: combined,
            unfilteredApps: combined,
            favorites,
            recentEntries,
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
        const updated = addRecentApp(id)
            .filter((entry) => entry.type === 'app')
            .slice(0, 10);
        this.setState({ recentEntries: updated }, () => {
            if (typeof this.props.openApp === 'function') {
                this.props.openApp(id);
            }
        });
    };

    handleClearRecents = () => {
        clearRecentEntries();
        this.setState({ recentEntries: [] });
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

    renderRecentSection = (items) => {
        const hasItems = items.length > 0;
        return (
            <section key="recent" aria-label="Recent apps" className="mb-8 w-full">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
                        Recent
                    </h2>
                    {hasItems && (
                        <button
                            type="button"
                            onClick={this.handleClearRecents}
                            className="text-xs font-semibold uppercase tracking-wide text-ubt-blue transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        >
                            Clear
                        </button>
                    )}
                </div>
                {hasItems ? (
                    <ul className="flex flex-col gap-2" role="list">
                        {items.map(({ app, entry }) => this.renderRecentItem(app, entry))}
                    </ul>
                ) : (
                    <p className="text-sm text-white/70">Open an application to see it here.</p>
                )}
            </section>
        );
    };

    renderRecentItem = (app, entry) => {
        const isDisabled = Boolean(app.disabled);
        const relative = formatRelativeTime(entry.openedAt);
        const absolute = formatAbsoluteTime(entry.openedAt);
        const labelTime = relative || absolute;
        const handleClick = () => {
            if (!isDisabled) {
                this.openApp(app.id);
            }
        };

        return (
            <li key={`recent-${entry.type}-${entry.id}`}>
                <button
                    type="button"
                    onClick={handleClick}
                    aria-disabled={isDisabled}
                    disabled={isDisabled}
                    aria-label={`Open ${app.title}, last opened ${labelTime}`}
                    title={`${app.title} — ${absolute}`}
                    className={`flex w-full items-center gap-4 rounded border border-white/5 bg-black/40 p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                        isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-black/60'
                    }`}
                >
                    <Image
                        src={app.icon.replace('./', '/')}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded"
                        sizes="40px"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{app.title}</span>
                        <span className="text-xs text-gray-300">
                            Last opened{' '}
                            <time dateTime={new Date(entry.openedAt).toISOString()} title={absolute}>
                                {labelTime}
                            </time>
                        </span>
                    </div>
                </button>
            </li>
        );
    };

    render() {
        const { apps, favorites, recentEntries } = this.state;
        const favoriteSet = new Set(favorites);
        const appMap = new Map(apps.map((app) => [app.id, app]));
        const favoriteApps = apps.filter((app) => favoriteSet.has(app.id));
        const recentItems = recentEntries
            .map((entry) => {
                const app = appMap.get(entry.id);
                if (!app) return null;
                return { app, entry };
            })
            .filter(Boolean);
        const seenIds = new Set([
            ...favoriteApps,
            ...recentItems.map((item) => item.app),
        ].map((app) => app.id));
        const remainingApps = apps.filter((app) => !seenIds.has(app.id));
        const groupedApps = chunkApps(remainingApps, GROUP_SIZE);
        const hasResults =
            favoriteApps.length > 0 ||
            recentItems.length > 0 ||
            groupedApps.some((group) => group.length > 0);

        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <input
                    className="mt-10 mb-8 w-2/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none md:w-1/3"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                    aria-label="Search applications"
                />
                <div className="flex w-full max-w-5xl flex-col items-stretch px-6 pb-10">
                    {this.renderSection('Favorites', favoriteApps)}
                    {this.renderRecentSection(recentItems)}
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

