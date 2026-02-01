import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';

const FAVORITES_KEY = 'launcherFavorites';
const RECENTS_KEY = 'recentApps';

const DEFAULT_FOLDER_ICON = '/themes/Yaru/system/folder.png';

const buildIdSet = (ids) => new Set(ids);

const SYSTEM_APP_IDS = buildIdSet([
    'terminal',
    'files',
    'settings',
    'resource-monitor',
    'screen-recorder',
    'plugin-manager',
    'trash',
    'about',
    'contact',
]);

const PRODUCTIVITY_APP_IDS = buildIdSet([
    'calculator',
    'converter',
    'todoist',
    'sticky_notes',
    'spotify',
    'youtube',
    'firefox',
    'x',
]);

const DEVELOPMENT_APP_IDS = buildIdSet([
    'vscode',
    'ssh',
    'http',
    'html-rewriter',
    'serial-terminal',
]);

const RECON_APP_IDS = buildIdSet([
    'wireshark',
    'nmap-nse',
    'openvas',
    'recon-ng',
    'nessus',
    'kismet',
    'ble-sensor',
    'nikto',
    'security-tools',
]);

const EXPLOIT_APP_IDS = buildIdSet([
    'metasploit',
    'msf-post',
    'hashcat',
    'hydra',
    'mimikatz',
    'mimikatz/offline',
    'john',
    'reaver',
    'dsniff',
    'beef',
    'ettercap',
]);

const FORENSICS_APP_IDS = buildIdSet([
    'autopsy',
    'evidence-vault',
    'volatility',
    'radare2',
    'ghidra',
]);

const UTILITY_APP_IDS = buildIdSet([
    'qr',
    'ascii-art',
    'clipboard-manager',
    'figlet',
    'quote',
    'project-gallery',
    'input-lab',
    'subnet-calculator',
    'weather',
    'weather-widget',
]);

const sortAppsByTitle = (collection = []) =>
    [...collection].sort((a, b) => a.title.localeCompare(b.title));

const createFolderDefinitions = (gameIds = new Set()) => [
    {
        id: 'system',
        title: 'System & Workspace',
        description: 'Core desktop controls and preferences.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#38bdf8',
        match: (app) => SYSTEM_APP_IDS.has(app.id),
        defaultOpen: true,
    },
    {
        id: 'productivity',
        title: 'Productivity & Media',
        description: 'Everyday apps, media, and communication.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#f97316',
        match: (app) => PRODUCTIVITY_APP_IDS.has(app.id),
    },
    {
        id: 'development',
        title: 'Development & Builders',
        description: 'Coding, request builders, and terminals.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#a855f7',
        match: (app) => DEVELOPMENT_APP_IDS.has(app.id),
    },
    {
        id: 'recon',
        title: 'Recon & Monitoring',
        description: 'Discovery, scanning, and situational awareness.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#22d3ee',
        match: (app) => RECON_APP_IDS.has(app.id),
    },
    {
        id: 'exploitation',
        title: 'Exploitation & Post-Exploitation',
        description: 'Credential attacks and offensive tooling simulations.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#facc15',
        match: (app) => EXPLOIT_APP_IDS.has(app.id),
    },
    {
        id: 'forensics',
        title: 'Forensics & Reverse Engineering',
        description: 'Analysis suites and evidence tooling.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#f472b6',
        match: (app) => FORENSICS_APP_IDS.has(app.id),
    },
    {
        id: 'utilities',
        title: 'Utilities & Widgets',
        description: 'Quick helpers, calculators, and widgets.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#34d399',
        match: (app) => UTILITY_APP_IDS.has(app.id),
    },
    {
        id: 'games',
        title: 'Games & Arcade',
        description: 'Retro games and quick challenges.',
        icon: DEFAULT_FOLDER_ICON,
        accent: '#fb7185',
        match: (app) => gameIds.has(app.id),
    },
];

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
        const recents = sanitizeIds(readStoredIds(RECENTS_KEY), availableIds, 10);

        persistIds(FAVORITES_KEY, favorites);
        persistIds(RECENTS_KEY, recents);

        this.setState({
            apps: sorted,
            unfilteredApps: sorted,
            favorites,
            recents,
        });
    }

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredApps } = this.state;
        const query = typeof value === 'string' ? value : '';
        const lower = query.toLowerCase();
        const filtered =
            query === ''
                ? unfilteredApps
                : unfilteredApps.filter((app) =>
                      app.title.toLowerCase().includes(lower)
                  );
        this.setState({ query, apps: sortAppsByTitle(filtered) });
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
            <div
                key={app.id}
                className="relative flex w-full items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-lg transition hover:border-sky-300/70 focus-within:ring-2 focus-within:ring-sky-300/70"
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
                    prefetch={app.screen?.prefetch}
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
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                        {apps.map((app) => this.renderAppTile(app))}
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
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {folder.items.map((app) => this.renderAppTile(app))}
                </div>
            </details>
        );
    };

    render() {
        const { apps, favorites, recents } = this.state;
        const { searchInputRef, headingId = 'all-apps-title' } = this.props;
        const appMap = new Map(apps.map((app) => [app.id, app]));
        const favoriteApps = sortAppsByTitle(
            favorites
                .map((id) => appMap.get(id))
                .filter(Boolean)
        );
        const recentApps = recents
            .map((id) => appMap.get(id))
            .filter(Boolean);
        const gameIdSet = new Set((this.props.games || []).map((game) => game.id));
        const folderTemplates = createFolderDefinitions(gameIdSet).map((folder) => ({
            ...folder,
            items: [],
        }));
        const assignedIds = new Set();
        apps.forEach((app) => {
            for (const folder of folderTemplates) {
                if (folder.match && folder.match(app)) {
                    folder.items.push(app);
                    assignedIds.add(app.id);
                    return;
                }
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
            <div className="flex w-full flex-col items-center text-white">
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
                                aria-label="Search applications"
                            />
                        </div>
                    </div>
                </header>
                <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col items-stretch px-4 pb-12 sm:px-6 md:px-8 lg:px-10 xl:px-0">
                    {this.renderSection('Favorites', favoriteApps)}
                    {this.renderSection('Recent', recentApps)}
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
