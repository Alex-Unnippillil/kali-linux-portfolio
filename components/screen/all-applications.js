import React from 'react';
import VirtualList from 'rc-virtual-list';
import UbuntuApp from '../base/ubuntu_app';
import { APP_CATEGORIES } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { addRecentApp, readRecentAppIds, writeRecentAppIds } from '../../utils/recentStorage';

const FAVORITES_KEY = 'launcherFavorites';

const DEFAULT_FOLDER_ICON = '/themes/Yaru/system/folder.png';
const MAX_RECENT_APPS = 10;
const GRID_ROW_HEIGHT = 176;
const MAX_GRID_HEIGHT = 560;

const SEARCH_WEIGHTS = {
    exactTitle: 100,
    startsWith: 80,
    word: 60,
    tag: 40,
    description: 20,
};

const sortAppsByTitle = (collection = []) =>
    [...collection].sort((a, b) => a.title.localeCompare(b.title));

const createFolderDefinitions = () =>
    Object.values(APP_CATEGORIES).map((category) => ({
        ...category,
        icon: category.icon || DEFAULT_FOLDER_ICON,
        items: [],
    }));

const getColumnCount = (width = 0) => {
    if (width >= 1536) return 6;
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    if (width >= 640) return 2;
    return 1;
};

const chunkApps = (apps, columns) => {
    if (!apps.length) return [];
    const rows = [];
    for (let i = 0; i < apps.length; i += columns) {
        rows.push(apps.slice(i, i + columns));
    }
    return rows;
};

const buildTokens = (query) =>
    query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

const scoreAppMatch = (app, query, tokens) => {
    const title = app.title.toLowerCase();
    const description = (app.description || '').toLowerCase();
    const tags = (app.tags || []).map((tag) => tag.toLowerCase());
    const capabilities = (app.capabilities || []).map((cap) => cap.toLowerCase());
    const titleWords = title.split(/\s+/);
    const matchedTokens = new Set();
    let score = 0;

    if (title === query) {
        score += SEARCH_WEIGHTS.exactTitle;
        matchedTokens.add(query);
    } else if (title.startsWith(query)) {
        score += SEARCH_WEIGHTS.startsWith;
        matchedTokens.add(query);
    }

    tokens.forEach((token) => {
        if (titleWords.some((word) => word.startsWith(token))) {
            score += SEARCH_WEIGHTS.word;
            matchedTokens.add(token);
            return;
        }

        if (tags.some((tag) => tag.includes(token)) || capabilities.some((cap) => cap.includes(token))) {
            score += SEARCH_WEIGHTS.tag;
            matchedTokens.add(token);
            return;
        }

        if (description.includes(token)) {
            score += SEARCH_WEIGHTS.description;
            matchedTokens.add(token);
        }
    });

    return { score, matchedTokens: [...matchedTokens] };
};

const rankApps = (apps, query) => {
    if (!query.trim()) {
        return { results: sortAppsByTitle(apps), matches: {} };
    }

    const tokens = buildTokens(query);
    const matches = {};
    const results = apps
        .map((app) => {
            const match = scoreAppMatch(app, query.toLowerCase(), tokens);
            if (match.score > 0) {
                matches[app.id] = match;
            }
            return { app, score: match.score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.app.title.localeCompare(b.app.title);
        })
        .map(({ app }) => app);

    return { results, matches };
};

const highlightMatch = (text, tokens = []) => {
    if (!tokens.length) return text;
    const pattern = tokens
        .filter(Boolean)
        .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    if (!pattern) return text;
    const regex = new RegExp(`(${pattern})`, 'gi');
    return text.split(regex).map((part, index) =>
        part.match(regex) ? (
            <mark key={`${part}-${index}`} className="rounded bg-sky-300/20 px-1 text-sky-200">
                {part}
            </mark>
        ) : (
            part
        )
    );
};

const VirtualizedAppGrid = ({ apps, columns, renderTile }) => {
    const rows = React.useMemo(() => chunkApps(apps, columns), [apps, columns]);
    const height = Math.min(rows.length * GRID_ROW_HEIGHT, MAX_GRID_HEIGHT);
    if (!rows.length) return null;

    return (
        <VirtualList
            data={rows}
            height={height}
            itemHeight={GRID_ROW_HEIGHT}
            itemKey={(row) => row.map((app) => app.id).join('-')}
        >
            {(row) => (
                <div
                    className="w-full"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        gap: '1rem',
                    }}
                >
                    {row.map((app) => renderTile(app))}
                </div>
            )}
        </VirtualList>
    );
};

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

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            favorites: [],
            recents: [],
            searchMatches: {},
            focusedIndex: null,
            columnCount: 1,
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        const sorted = sortAppsByTitle(combined);
        const availableIds = new Set(sorted.map((app) => app.id));
        const favorites = sanitizeIds(readStoredIds(FAVORITES_KEY), availableIds);
        const recents = sanitizeIds(readRecentAppIds(), availableIds, MAX_RECENT_APPS);

        persistIds(FAVORITES_KEY, favorites);
        writeRecentAppIds(recents);

        this.setState({
            apps: sorted,
            unfilteredApps: sorted,
            favorites,
            recents,
            columnCount: getColumnCount(window.innerWidth),
        });

        this.handleResize = () => {
            this.setState({ columnCount: getColumnCount(window.innerWidth) });
        };
        window.addEventListener('resize', this.handleResize);
    }

    componentWillUnmount() {
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }
    }

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredApps } = this.state;
        const query = typeof value === 'string' ? value : '';
        const { results, matches } = rankApps(unfilteredApps, query);
        this.setState({
            query,
            apps: results,
            searchMatches: matches,
            focusedIndex: null,
        });
    };

    openApp = (id) => {
        this.setState(
            (state) => {
                const next = sanitizeIds(addRecentApp(id), new Set(state.unfilteredApps.map((app) => app.id)), MAX_RECENT_APPS);
                writeRecentAppIds(next);
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

    handleToggleFavoriteById = (id) => {
        this.setState((state) => {
            const isFavorite = state.favorites.includes(id);
            const favorites = isFavorite
                ? state.favorites.filter((favId) => favId !== id)
                : [...state.favorites, id];
            persistIds(FAVORITES_KEY, favorites);
            return { favorites };
        });
    };

    handleKeyDown = (event) => {
        const { apps, focusedIndex, columnCount } = this.state;
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) return;

        if (event.target?.tagName === 'INPUT' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return;
        }

        if (!apps.length) return;

        if (event.key === 'Enter' && focusedIndex !== null) {
            event.preventDefault();
            const app = apps[focusedIndex];
            if (!app) return;
            if (event.ctrlKey) {
                this.handleToggleFavoriteById(app.id);
                return;
            }
            this.openApp(app.id);
            return;
        }

        if (event.key === 'ArrowDown' && focusedIndex === null) {
            event.preventDefault();
            this.focusAppIndex(0);
            return;
        }

        if (focusedIndex === null) return;

        let nextIndex = focusedIndex;
        const rowJump = columnCount || 1;

        switch (event.key) {
            case 'ArrowUp':
                nextIndex = Math.max(0, focusedIndex - rowJump);
                break;
            case 'ArrowDown':
                nextIndex = Math.min(apps.length - 1, focusedIndex + rowJump);
                break;
            case 'ArrowLeft':
                nextIndex = Math.max(0, focusedIndex - 1);
                break;
            case 'ArrowRight':
                nextIndex = Math.min(apps.length - 1, focusedIndex + 1);
                break;
            default:
                break;
        }

        if (nextIndex !== focusedIndex) {
            event.preventDefault();
            this.focusAppIndex(nextIndex);
        }
    };

    focusAppIndex = (index) => {
        this.setState({ focusedIndex: index }, () => {
            const app = this.state.apps[index];
            if (!app) return;
            const node = document.getElementById(`app-${app.id}`);
            if (node && typeof node.focus === 'function') {
                node.focus();
            }
        });
    };

    renderAppTile = (app, index) => {
        const isFavorite = this.state.favorites.includes(app.id);
        const shouldPrefetch = app.prefetchOnHover !== false;
        const match = this.state.searchMatches[app.id];
        const highlightTokens = match ? match.matchedTokens : [];
        const displayName = highlightMatch(app.title, highlightTokens);
        return (
            <div
                key={app.id}
                className="relative flex w-full items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-lg transition hover:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-300/70"
                onFocus={() => {
                    if (typeof index === 'number') {
                        this.setState({ focusedIndex: index });
                    }
                }}
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
                    className={`absolute right-3 top-3 text-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
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
                    displayName={displayName}
                    isSelected={this.state.focusedIndex === index}
                    onFocus={() => {
                        if (typeof index === 'number') {
                            this.setState({ focusedIndex: index });
                        }
                    }}
                    prefetch={shouldPrefetch ? app.screen?.prefetch : undefined}
                />
            </div>
        );
    };

    renderSection = (title, apps) => {
        if (!apps.length) return null;
        const containerStyles = {
            borderColor: 'color-mix(in srgb, var(--color-accent), transparent 65%)',
            boxShadow: '0 20px 52px -30px color-mix(in srgb, var(--color-accent), transparent 55%)',
        };
        return (
            <section key={title} aria-label={`${title} apps`} className="w-full">
                <div
                    className="mb-8 rounded-3xl border bg-slate-900/65 p-5 shadow-xl backdrop-blur-xl"
                    style={containerStyles}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-base font-semibold uppercase tracking-[0.35em] text-white/80">
                            {title}
                        </h2>
                        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
                            {apps.length} {apps.length === 1 ? 'app' : 'apps'}
                        </span>
                    </div>
                    <div className="mt-4">
                        <VirtualizedAppGrid
                            apps={apps}
                            columns={this.state.columnCount}
                            renderTile={(app) => {
                                const index = this.appIndexMap?.get(app.id);
                                return this.renderAppTile(app, index);
                            }}
                        />
                    </div>
                </div>
            </section>
        );
    };

    renderFolder = (folder, forceOpen = false) => {
        if (!folder || !folder.items || !folder.items.length) return null;
        const accent = folder.accent || '#38bdf8';
        const containerStyles = {
            borderColor: `color-mix(in srgb, ${accent}, transparent 68%)`,
            boxShadow: `0 22px 60px -30px color-mix(in srgb, ${accent}, transparent 60%)`,
        };
        const summaryStyles = {
            background: `linear-gradient(135deg, color-mix(in srgb, ${accent}, transparent 82%) 0%, rgba(15,23,42,0.92) 45%, rgba(15,23,42,0.75) 100%)`,
            listStyle: 'none',
        };
        const countLabel = `${folder.items.length} ${folder.items.length === 1 ? 'app' : 'apps'}`;
        return (
            <details
                key={folder.id}
                className="group/folder w-full rounded-3xl border bg-slate-900/65 p-4 text-white shadow-xl backdrop-blur-xl transition"
                open={forceOpen || folder.defaultOpen}
                style={containerStyles}
            >
                <summary
                    className="flex cursor-pointer flex-col gap-4 rounded-2xl px-3 py-2 text-left transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:flex-row sm:items-center sm:justify-between"
                    style={summaryStyles}
                >
                    <span className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-800/70 ring-1 ring-white/10">
                            <img src={folder.icon} alt="" className="h-9 w-9 object-contain" aria-hidden="true" />
                        </span>
                        <span className="flex flex-col">
                            <span className="text-lg font-semibold">{folder.title}</span>
                            {folder.description ? (
                                <span className="text-xs font-normal text-white/60">{folder.description}</span>
                            ) : null}
                        </span>
                    </span>
                    <span
                        className="text-xs font-semibold uppercase tracking-[0.35em]"
                        style={{ color: `color-mix(in srgb, ${accent}, white 25%)` }}
                    >
                        {countLabel}
                    </span>
                </summary>
                <div className="mt-4">
                    <VirtualizedAppGrid
                        apps={folder.items}
                        columns={this.state.columnCount}
                        renderTile={(app) => {
                            const index = this.appIndexMap?.get(app.id);
                            return this.renderAppTile(app, index);
                        }}
                    />
                </div>
            </details>
        );
    };

    render() {
        const { apps, favorites, recents } = this.state;
        const { searchInputRef, headingId = 'all-apps-title' } = this.props;
        const appMap = new Map(apps.map((app) => [app.id, app]));
        this.appIndexMap = new Map(apps.map((app, index) => [app.id, index]));
        const favoriteApps = sortAppsByTitle(
            favorites
                .map((id) => appMap.get(id))
                .filter(Boolean)
        );
        const recentApps = recents
            .map((id) => appMap.get(id))
            .filter(Boolean);
        const folderTemplates = createFolderDefinitions();
        const folderMap = new Map(folderTemplates.map((folder) => [folder.id, folder]));
        const assignedIds = new Set();
        apps.forEach((app) => {
            const targetFolder = app.category ? folderMap.get(app.category) : null;
            if (targetFolder) {
                targetFolder.items.push(app);
                assignedIds.add(app.id);
            }
        });
        const remainingApps = apps.filter((app) => !assignedIds.has(app.id));
        if (remainingApps.length) {
            folderTemplates.push({
                id: 'other',
                title: 'Additional Apps',
                description: 'Tools that do not fit into the main folders.',
                icon: DEFAULT_FOLDER_ICON,
                accent: '#94a3b8',
                match: () => false,
                items: sortAppsByTitle(remainingApps),
            });
        }
        const folderSections = folderTemplates
            .map((folder) => ({
                ...folder,
                items: sortAppsByTitle(folder.items || []),
            }))
            .filter((folder) => folder.items.length > 0);

        const hasResults =
            favoriteApps.length > 0 ||
            recentApps.length > 0 ||
            folderSections.length > 0;

        const headerAccentStyles = {
            borderColor: 'color-mix(in srgb, var(--color-accent), transparent 55%)',
            boxShadow: '0 35px 80px -45px color-mix(in srgb, var(--color-accent), transparent 35%)',
            background: 'linear-gradient(145deg, color-mix(in srgb, var(--color-accent), transparent 75%) 0%, rgba(15,23,42,0.85) 45%, rgba(15,23,42,0.7) 100%)',
        };

        const searchAccentStyles = {
            borderColor: 'color-mix(in srgb, var(--color-accent), transparent 55%)',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-accent), transparent 75%) inset',
        };

        const forceOpenFolders = Boolean(this.state.query);

        return (
            <div className="flex w-full flex-col items-center text-white" onKeyDown={this.handleKeyDown}>
                <header className="w-full px-4 sm:px-6 md:px-8">
                    <div
                        className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-3xl border bg-slate-900/70 p-6 backdrop-blur-xl"
                        style={headerAccentStyles}
                    >
                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                                Launcher
                            </span>
                            <h1
                                id={headingId}
                                className="text-3xl font-semibold tracking-tight"
                                style={{ color: 'var(--color-accent)' }}
                            >
                                All applications
                            </h1>
                        </div>
                        <div className="w-full max-w-3xl">
                            <label className="sr-only" htmlFor={`${headingId}-search`}>
                                Search applications
                            </label>
                            <input
                                id={`${headingId}-search`}
                                ref={searchInputRef}
                                className="w-full rounded-2xl border bg-slate-950/60 px-4 py-3 text-base shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                                style={searchAccentStyles}
                                placeholder="Search"
                                value={this.state.query}
                                onChange={this.handleChange}
                                onKeyDown={this.handleKeyDown}
                                aria-label="Search applications"
                            />
                        </div>
                    </div>
                </header>
                <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col items-stretch px-4 pb-12 sm:px-6 md:px-8 lg:px-10 xl:px-0">
                    {this.renderSection('Pinned', favoriteApps)}
                    {this.renderSection('Suggested', recentApps)}
                    {folderSections.length ? (
                        <div className="mx-auto w-full space-y-6">
                            {folderSections.map((folder) =>
                                this.renderFolder(folder, forceOpenFolders)
                            )}
                        </div>
                    ) : null}
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
