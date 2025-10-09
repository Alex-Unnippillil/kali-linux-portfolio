import React, { useEffect, useRef, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const LauncherTileMenu = ({
    active,
    onClose,
    onOpen,
    onOpenInWorkspace,
    onPin,
    onUnpin,
    pinned,
    workspaces = [],
    appTitle,
    setMenuNode,
    activeWorkspace = 0,
}) => {
    const menuRef = useRef(null);
    const workspaceRef = useRef(null);
    const [workspaceOpen, setWorkspaceOpen] = useState(false);

    useFocusTrap(menuRef, active);
    useRovingTabIndex(menuRef, active, 'vertical');
    useRovingTabIndex(workspaceRef, active && workspaceOpen, 'vertical');

    useEffect(() => {
        if (!setMenuNode) return undefined;
        if (active) {
            setMenuNode(menuRef.current);
            return () => setMenuNode(null);
        }
        setMenuNode(null);
        return undefined;
    }, [active, setMenuNode]);

    useEffect(() => {
        if (active && menuRef.current) {
            const firstItem = menuRef.current.querySelector('[role="menuitem"]');
            if (firstItem) {
                firstItem.focus();
            }
        }
    }, [active]);

    useEffect(() => {
        if (!active) {
            setWorkspaceOpen(false);
        }
    }, [active]);

    useEffect(() => {
        if (workspaceOpen && workspaceRef.current) {
            const firstWorkspace = workspaceRef.current.querySelector('[role="menuitem"]');
            if (firstWorkspace) firstWorkspace.focus();
        }
    }, [workspaceOpen]);

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            if (workspaceOpen) {
                setWorkspaceOpen(false);
                return;
            }
            if (typeof onClose === 'function') onClose();
        }
    };

    const handleOpen = () => {
        if (typeof onOpen === 'function') {
            onOpen();
        }
        if (typeof onClose === 'function') onClose();
    };

    const handlePinClick = () => {
        if (pinned) {
            if (typeof onUnpin === 'function') onUnpin();
        } else if (typeof onPin === 'function') {
            onPin();
        }
        if (typeof onClose === 'function') onClose();
    };

    const handleWorkspaceSelect = (workspaceId) => {
        if (typeof onOpenInWorkspace === 'function') {
            onOpenInWorkspace(workspaceId);
        }
        if (typeof onClose === 'function') onClose();
    };

    const workspaceLabel = (workspace) => {
        if (!workspace || typeof workspace.label !== 'string') return 'Workspace';
        if (workspace.id === activeWorkspace) {
            return `${workspace.label} (current)`;
        }
        return workspace.label;
    };

    return (
        <div
            ref={menuRef}
            role="menu"
            aria-hidden={!active}
            aria-label={`Actions for ${appTitle}`}
            onKeyDown={handleKeyDown}
            className={`${active ? 'block' : 'hidden'} absolute right-2 top-10 z-50 w-60 rounded border border-gray-900 bg-black/90 p-3 text-left text-sm text-white shadow-lg backdrop-blur`}
        >
            <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={handleOpen}
            >
                <span>Open</span>
            </button>
            <div className="relative mt-1">
                <button
                    type="button"
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={workspaceOpen}
                    className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    onClick={() => setWorkspaceOpen((value) => !value)}
                >
                    <span>Open in workspace</span>
                    <span aria-hidden="true">▸</span>
                </button>
                <div
                    ref={workspaceRef}
                    role="menu"
                    aria-hidden={!workspaceOpen}
                    className={`${workspaceOpen ? 'mt-2 block' : 'hidden'} space-y-1 rounded border border-gray-800 bg-black/80 p-2`}
                >
                    {workspaces.length > 0 ? (
                        workspaces.map((workspace) => (
                            <button
                                key={workspace.id}
                                type="button"
                                role="menuitem"
                                className="w-full rounded px-2 py-1 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                                onClick={() => handleWorkspaceSelect(workspace.id)}
                            >
                                {workspaceLabel(workspace)}
                            </button>
                        ))
                    ) : (
                        <span className="block px-2 py-1 text-white/60">No workspaces available</span>
                    )}
                </div>
            </div>
            <button
                type="button"
                role="menuitem"
                className="mt-1 flex w-full items-center justify-between rounded px-2 py-1 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={handlePinClick}
            >
                <span>{pinned ? 'Unpin from dock' : 'Pin to dock'}</span>
            </button>
        </div>
    );
};

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
            menuAppId: null,
        };

        this.menuButtonRefs = new Map();
        this.menuNode = null;
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

        if (typeof document !== 'undefined') {
            document.addEventListener('pointerdown', this.handleGlobalPointerDown, true);
        }
    }

    componentWillUnmount() {
        if (typeof document !== 'undefined') {
            document.removeEventListener('pointerdown', this.handleGlobalPointerDown, true);
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

    handleGlobalPointerDown = (event) => {
        const { menuAppId } = this.state;
        if (!menuAppId) return;
        const target = event?.target;
        const NodeCtor = typeof Node !== 'undefined' ? Node : null;
        if (!target || (NodeCtor && !(target instanceof NodeCtor))) return;
        if (this.menuNode && this.menuNode.contains(target)) return;
        const button = this.menuButtonRefs.get(menuAppId);
        if (button && button.contains(target)) return;
        this.closeMenu();
    };

    setMenuNode = (node) => {
        this.menuNode = node;
    };

    setMenuButtonRef = (id) => (node) => {
        if (node) {
            this.menuButtonRefs.set(id, node);
        } else {
            this.menuButtonRefs.delete(id);
        }
    };

    openMenu = (event, id) => {
        event.preventDefault();
        event.stopPropagation();
        this.setState((state) => ({
            menuAppId: state.menuAppId === id ? null : id,
        }));
    };

    closeMenu = () => {
        const { menuAppId } = this.state;
        if (!menuAppId) return;
        this.setState({ menuAppId: null }, () => {
            const anchor = this.menuButtonRefs.get(menuAppId);
            if (anchor && typeof anchor.focus === 'function') {
                anchor.focus();
            }
        });
    };

    openAppInWorkspace = (id, workspaceId) => {
        this.setState((state) => {
            const filtered = state.recents.filter((recentId) => recentId !== id);
            const next = [id, ...filtered].slice(0, 10);
            persistIds(RECENTS_KEY, next);
            return { recents: next };
        }, () => {
            if (typeof this.props.openAppInWorkspace === 'function') {
                this.props.openAppInWorkspace(id, workspaceId);
            }
        });
    };

    handlePin = (id) => {
        if (typeof this.props.pinApp === 'function') {
            this.props.pinApp(id);
        }
    };

    handleUnpin = (id) => {
        if (typeof this.props.unpinApp === 'function') {
            this.props.unpinApp(id);
        }
    };

    renderAppTile = (app) => {
        const isFavorite = this.state.favorites.includes(app.id);
        const isPinned = typeof this.props.isAppPinned === 'function' ? this.props.isAppPinned(app.id) : false;
        const menuActive = this.state.menuAppId === app.id;
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
                <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuActive}
                    aria-label={`More options for ${app.title}`}
                    onClick={(event) => this.openMenu(event, app.id)}
                    ref={this.setMenuButtonRef(app.id)}
                    className={`absolute right-2 top-10 rounded p-1 text-base text-white/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        menuActive ? 'bg-white/10 text-white' : 'hover:bg-white/10 hover:text-white'
                    }`}
                >
                    ⋮
                </button>
                <LauncherTileMenu
                    active={menuActive}
                    onClose={this.closeMenu}
                    onOpen={() => this.openApp(app.id)}
                    onOpenInWorkspace={(workspaceId) => this.openAppInWorkspace(app.id, workspaceId)}
                    onPin={() => this.handlePin(app.id)}
                    onUnpin={() => this.handleUnpin(app.id)}
                    pinned={isPinned}
                    workspaces={this.props.workspaces}
                    activeWorkspace={this.props.activeWorkspace}
                    appTitle={app.title}
                    setMenuNode={this.setMenuNode}
                />
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

