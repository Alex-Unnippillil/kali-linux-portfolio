import React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Grid as VirtualGrid } from 'react-window';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';

const FAVORITES_KEY = 'launcherFavorites';
const RECENTS_KEY = 'recentApps';
const VIRTUAL_ROW_HEIGHT = 128;
const VIRTUAL_COLUMN_MIN_WIDTH = 120;
const VIRTUAL_CELL_PADDING = 12;
const TYPEAHEAD_TIMEOUT = 700;

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

const isAlphaNumeric = (char) => /^[0-9a-z]$/i.test(char);

const getAppTitle = (app) => app?.title?.trim?.() || '';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            favorites: [],
            recents: [],
            focusedAppName: '',
        };
        this.gridRef = React.createRef();
        this.typeaheadTimeout = null;
        this.typeaheadBuffer = '';
        this.currentColumnCount = 1;
        this.lastTypeaheadTime = 0;
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

    componentWillUnmount() {
        if (this.typeaheadTimeout) {
            clearTimeout(this.typeaheadTimeout);
        }
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

    announceFocus = (app) => {
        const title = getAppTitle(app);
        if (title) {
            this.setState({ focusedAppName: title });
        }
    };

    openApp = (id) => {
        this.setState(
            (state) => {
                const filtered = state.recents.filter((recentId) => recentId !== id);
                const next = [id, ...filtered].slice(0, 10);
                persistIds(RECENTS_KEY, next);
                return { recents: next };
            },
            () => {
                if (typeof this.props.openApp === 'function') {
                    this.props.openApp(id);
                }
            }
        );
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

    focusVirtualIndex = (index, apps) => {
        if (!Array.isArray(apps) || index < 0 || index >= apps.length) return;
        const columnCount = this.currentColumnCount || 1;
        const rowIndex = Math.floor(index / columnCount);
        const columnIndex = index % columnCount;
        if (this.gridRef.current && typeof this.gridRef.current.scrollToItem === 'function') {
            this.gridRef.current.scrollToItem({ rowIndex, columnIndex, align: 'smart' });
        }
        const targetId = `app-${apps[index].id}`;
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(() => {
                const element = document.getElementById(targetId);
                if (element) {
                    element.focus();
                }
            });
        }
    };

    handleTypeahead = (key, currentIndex, apps) => {
        if (!isAlphaNumeric(key) || !apps.length) return;
        const lower = key.toLowerCase();
        const now = Date.now();
        if (now - this.lastTypeaheadTime > TYPEAHEAD_TIMEOUT) {
            this.typeaheadBuffer = '';
        }
        this.lastTypeaheadTime = now;
        this.typeaheadBuffer += lower;
        if (this.typeaheadTimeout) clearTimeout(this.typeaheadTimeout);
        this.typeaheadTimeout = setTimeout(() => {
            this.typeaheadBuffer = '';
        }, TYPEAHEAD_TIMEOUT);

        const search = this.typeaheadBuffer;
        const total = apps.length;
        const start = (currentIndex + 1) % total;
        for (let step = 0; step < total; step += 1) {
            const idx = (start + step) % total;
            const title = getAppTitle(apps[idx]).toLowerCase();
            if (title.startsWith(search)) {
                this.focusVirtualIndex(idx, apps);
                break;
            }
        }
    };

    handleVirtualTileKeyDown = (event, index, apps) => {
        const columnCount = this.currentColumnCount || 1;
        const { key } = event;
        let handled = false;

        if (key === 'ArrowRight') {
            const next = index + 1;
            if (next < apps.length) {
                this.focusVirtualIndex(next, apps);
            }
            handled = true;
        } else if (key === 'ArrowLeft') {
            const prev = index - 1;
            if (prev >= 0) {
                this.focusVirtualIndex(prev, apps);
            }
            handled = true;
        } else if (key === 'ArrowDown') {
            const nextRow = index + columnCount;
            if (nextRow < apps.length) {
                this.focusVirtualIndex(nextRow, apps);
            }
            handled = true;
        } else if (key === 'ArrowUp') {
            const prevRow = index - columnCount;
            if (prevRow >= 0) {
                this.focusVirtualIndex(prevRow, apps);
            }
            handled = true;
        } else if (key === 'Home') {
            this.focusVirtualIndex(Math.floor(index / columnCount) * columnCount, apps);
            handled = true;
        } else if (key === 'End') {
            const rowStart = Math.floor(index / columnCount) * columnCount;
            const rowEnd = Math.min(rowStart + columnCount - 1, apps.length - 1);
            this.focusVirtualIndex(rowEnd, apps);
            handled = true;
        } else if (key === 'PageUp') {
            const prevPage = index - columnCount * 3;
            this.focusVirtualIndex(prevPage >= 0 ? prevPage : 0, apps);
            handled = true;
        } else if (key === 'PageDown') {
            const nextPage = index + columnCount * 3;
            this.focusVirtualIndex(nextPage < apps.length ? nextPage : apps.length - 1, apps);
            handled = true;
        } else if (key.length === 1 && isAlphaNumeric(key)) {
            this.handleTypeahead(key, index, apps);
            handled = true;
        }

        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    renderAppTile = (app, handlers = {}) => {
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
                    onFocus={() => this.announceFocus(app)}
                    onKeyDown={handlers.onKeyDown}
                />
            </div>
        );
    };

    renderStaticSection = (title, apps) => {
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

    renderVirtualizedSection = (title, apps) => {
        if (!apps.length) return null;
        return (
            <section key={title} aria-label={`${title} apps`} className="mb-8 w-full">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/70">
                    {title}
                </h2>
                <div
                    className="w-full overflow-hidden rounded-lg border border-white/10 bg-black/20"
                    style={{ height: '60vh', minHeight: 320 }}
                >
                    <AutoSizer>
                        {({ height, width }) => {
                            const columnCount = Math.max(
                                1,
                                Math.floor(width / (VIRTUAL_COLUMN_MIN_WIDTH + VIRTUAL_CELL_PADDING * 2))
                            );
                            this.currentColumnCount = columnCount;
                            const rowCount = Math.ceil(apps.length / columnCount);
                            const columnWidth = width / columnCount;
                            return (
                                <VirtualGrid
                                    ref={this.gridRef}
                                    columnCount={columnCount}
                                    columnWidth={columnWidth}
                                    height={height}
                                    rowCount={rowCount}
                                    rowHeight={VIRTUAL_ROW_HEIGHT}
                                    width={width}
                                    itemData={{ apps }}
                                >
                                    {({ columnIndex, rowIndex, style, data }) => {
                                        const index = rowIndex * columnCount + columnIndex;
                                        const app = data.apps[index];
                                        const cellStyle = {
                                            ...style,
                                            left: style.left + VIRTUAL_CELL_PADDING,
                                            top: style.top + VIRTUAL_CELL_PADDING,
                                            width: style.width - VIRTUAL_CELL_PADDING * 2,
                                            height: style.height - VIRTUAL_CELL_PADDING * 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        };
                                        if (!app) {
                                            return <div style={cellStyle} aria-hidden />;
                                        }
                                        return (
                                            <div style={cellStyle}>
                                                {this.renderAppTile(app, {
                                                    onKeyDown: (event) =>
                                                        this.handleVirtualTileKeyDown(event, index, apps),
                                                })}
                                            </div>
                                        );
                                    }}
                                </VirtualGrid>
                            );
                        }}
                    </AutoSizer>
                </div>
            </section>
        );
    };

    render() {
        const { apps, favorites, recents, focusedAppName } = this.state;
        const favoriteSet = new Set(favorites);
        const appMap = new Map(apps.map((app) => [app.id, app]));
        const favoriteApps = apps.filter((app) => favoriteSet.has(app.id));
        const recentApps = recents
            .map((id) => appMap.get(id))
            .filter(Boolean);
        const seenIds = new Set([...favoriteApps, ...recentApps].map((app) => app.id));
        const remainingApps = apps.filter((app) => !seenIds.has(app.id));
        const hasResults = favoriteApps.length > 0 || recentApps.length > 0 || remainingApps.length > 0;

        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <div role="status" aria-live="polite" className="sr-only">
                    {focusedAppName}
                </div>
                <input
                    className="mt-10 mb-8 w-2/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none md:w-1/3"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                    aria-label="Search applications"
                />
                <div className="flex w-full max-w-5xl flex-col items-stretch px-6 pb-10">
                    {this.renderStaticSection('Favorites', favoriteApps)}
                    {this.renderStaticSection('Recent', recentApps)}
                    {this.renderVirtualizedSection('All applications', remainingApps)}
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
