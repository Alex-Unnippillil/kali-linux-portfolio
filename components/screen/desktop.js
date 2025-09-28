"use client";

import React, { Component } from 'react';
import dynamic from 'next/dynamic';

const BackgroundImage = dynamic(
    () => import('../util-components/background-image'),
    { ssr: false }
);
import SideBar from './side_bar';
import apps, { games } from '../../apps.config';
import Window from '../base/window';
import UbuntuApp from '../base/ubuntu_app';
import AllApplications from '../screen/all-applications'
import ShortcutSelector from '../screen/shortcut-selector'
import WindowSwitcher from '../screen/window-switcher'
import DesktopMenu from '../context-menus/desktop-menu';
import DefaultMenu from '../context-menus/default';
import AppMenu from '../context-menus/app-menu';
import Taskbar from './taskbar';
import TaskbarMenu from '../context-menus/taskbar-menu';
import ReactGA from 'react-ga4';
import { toPng } from 'html-to-image';
import { safeLocalStorage } from '../../utils/safeStorage';
import { addRecentApp } from '../../utils/recentStorage';
import { useSnapSetting } from '../../hooks/usePersistentState';

const GRID_ICON_WIDTH = 96;
const GRID_ICON_HEIGHT = 96;
const GRID_GAP_X = 24;
const GRID_GAP_Y = 24;
const GRID_PADDING_X = 32;
const GRID_PADDING_Y = 32;

export class Desktop extends Component {
    constructor() {
        super();
        this.workspaceCount = 4;
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
        this.workspaceSnapshots = Array.from({ length: this.workspaceCount }, () => this.createEmptyWorkspaceState());
        this.workspaceKeys = new Set([
            'focused_windows',
            'closed_windows',
            'overlapped_windows',
            'minimized_windows',
            'window_positions',
            'hideSideBar',
        ]);
        this.initFavourite = {};
        this.allWindowClosed = false;
        this.state = {
            focused_windows: {},
            closed_windows: {},
            allAppsView: false,
            overlapped_windows: {},
            disabled_apps: {},
            favourite_apps: {},
            hideSideBar: false,
            minimized_windows: {},
            window_positions: {},
            desktop_apps: [],
            window_context: {},
            context_menus: {
                desktop: false,
                default: false,
                app: false,
                taskbar: false,
            },
            context_app: null,
            showNameBar: false,
            showShortcutSelector: false,
            showWindowSwitcher: false,
            switcherWindows: [],
            activeWorkspace: 0,
            workspaces: Array.from({ length: this.workspaceCount }, (_, index) => ({
                id: index,
                label: `Workspace ${index + 1}`,
            })),
            desktopLayout: this.getDefaultDesktopLayout(),
            selectedDesktopApp: null,
            renamingDesktopApp: null,
            renameDraft: '',
            renameHistory: [],
        }
        this.desktopGridRef = React.createRef();
        this.draggingDesktopApp = null;
        this.pendingLayout = null;
        this.appsById = new Map();
    }

    createEmptyWorkspaceState = () => ({
        focused_windows: {},
        closed_windows: {},
        overlapped_windows: {},
        minimized_windows: {},
        window_positions: {},
        hideSideBar: false,
    });

    cloneWorkspaceState = (state) => ({
        focused_windows: { ...state.focused_windows },
        closed_windows: { ...state.closed_windows },
        overlapped_windows: { ...state.overlapped_windows },
        minimized_windows: { ...state.minimized_windows },
        window_positions: { ...state.window_positions },
        hideSideBar: state.hideSideBar,
    });

    getDefaultDesktopLayout = () => ({
        icons: [],
        sortMode: 'custom',
    });

    loadPersistedDesktopLayout = () => {
        if (!safeLocalStorage) return this.getDefaultDesktopLayout();
        try {
            const stored = safeLocalStorage.getItem('desktop-layout');
            if (!stored) return this.getDefaultDesktopLayout();
            const parsed = JSON.parse(stored);
            if (!parsed || !Array.isArray(parsed.icons)) return this.getDefaultDesktopLayout();
            const icons = parsed.icons
                .filter((icon) => icon && icon.id)
                .map((icon, index) => ({
                    id: icon.id,
                    order: typeof icon.order === 'number' ? icon.order : index,
                    customName: typeof icon.customName === 'string' ? icon.customName : '',
                    addedAt: typeof icon.addedAt === 'number' ? icon.addedAt : Date.now() + index,
                }));
            const layout = {
                icons: this.applySortToIcons(parsed.sortMode || 'custom', icons),
                sortMode: parsed.sortMode || 'custom',
            };
            return layout;
        } catch (e) {
            return this.getDefaultDesktopLayout();
        }
    };

    persistDesktopLayout = () => {
        if (!safeLocalStorage) return;
        const layout = this.state.desktopLayout || this.getDefaultDesktopLayout();
        const payload = {
            icons: (layout.icons || []).map((icon) => ({
                id: icon.id,
                order: icon.order,
                customName: icon.customName || '',
                addedAt: icon.addedAt,
            })),
            sortMode: layout.sortMode || 'custom',
        };
        safeLocalStorage.setItem('desktop-layout', JSON.stringify(payload));
    };

    refreshAppsIndex = () => {
        this.appsById = new Map();
        apps.forEach((app) => {
            this.appsById.set(app.id, app);
        });
    };

    getAppById = (id) => this.appsById.get(id) || apps.find((app) => app.id === id);

    resolveIconType = (id) => {
        const app = this.getAppById(id);
        if (!app) return 'Application';
        if (typeof app.type === 'string' && app.type.trim()) return app.type;
        if (typeof app.category === 'string' && app.category.trim()) return app.category;
        if (app.id?.startsWith('new-folder') || app.icon?.includes('folder')) return 'Folder';
        if (games.some((game) => game.id === app.id)) return 'Game';
        if (app.id === 'trash') return 'System';
        return 'Application';
    };

    getIconDisplayName = (icon) => {
        if (!icon) return '';
        if (icon.customName && icon.customName.trim()) return icon.customName.trim();
        const app = this.getAppById(icon.id);
        return app?.title || icon.id;
    };

    sortIcons = (mode, icons) => {
        const list = icons.map((icon) => ({ ...icon }));
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
        switch (mode) {
            case 'name':
                list.sort((a, b) => collator.compare(this.getIconDisplayName(a), this.getIconDisplayName(b)));
                break;
            case 'type':
                list.sort((a, b) => {
                    const typeCompare = collator.compare(this.resolveIconType(a.id), this.resolveIconType(b.id));
                    if (typeCompare !== 0) return typeCompare;
                    return collator.compare(this.getIconDisplayName(a), this.getIconDisplayName(b));
                });
                break;
            case 'date':
                list.sort((a, b) => {
                    const diff = (a.addedAt ?? 0) - (b.addedAt ?? 0);
                    if (diff !== 0) return diff;
                    return collator.compare(this.getIconDisplayName(a), this.getIconDisplayName(b));
                });
                break;
            default:
                list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
        return list;
    };

    applySortToIcons = (mode, icons) => {
        const normalized = icons.map((icon, index) => ({
            id: icon.id,
            order: typeof icon.order === 'number' ? icon.order : index,
            customName: typeof icon.customName === 'string' ? icon.customName : '',
            addedAt: typeof icon.addedAt === 'number' ? icon.addedAt : Date.now() + index,
        }));
        let ordered = normalized.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        if (mode && mode !== 'custom') {
            ordered = this.sortIcons(mode, ordered);
        }
        return ordered.map((icon, index) => ({ ...icon, order: index }));
    };

    isLayoutChanged = (prevLayout, nextLayout) => {
        if (!prevLayout) return true;
        const prevMode = prevLayout.sortMode || 'custom';
        const nextMode = nextLayout.sortMode || 'custom';
        if (prevMode !== nextMode) return true;
        const prevIcons = Array.isArray(prevLayout.icons) ? prevLayout.icons : [];
        const nextIcons = Array.isArray(nextLayout.icons) ? nextLayout.icons : [];
        if (prevIcons.length !== nextIcons.length) return true;
        for (let index = 0; index < nextIcons.length; index += 1) {
            const prevIcon = prevIcons[index];
            const nextIcon = nextIcons[index];
            if (!prevIcon || !nextIcon) return true;
            if (prevIcon.id !== nextIcon.id) return true;
            if ((prevIcon.order ?? 0) !== (nextIcon.order ?? 0)) return true;
            if ((prevIcon.customName || '') !== (nextIcon.customName || '')) return true;
            if ((prevIcon.addedAt ?? 0) !== (nextIcon.addedAt ?? 0)) return true;
        }
        return false;
    };

    reconcileDesktopLayout = (ids, baseLayout, options = {}) => {
        const now = Date.now();
        const baseIcons = Array.isArray(baseLayout?.icons) ? baseLayout.icons : [];
        const baseMap = new Map(baseIcons.map((icon) => [icon.id, icon]));
        let maxOrder = baseIcons.reduce((max, icon) => Math.max(max, typeof icon.order === 'number' ? icon.order : -1), -1);

        const icons = ids.map((id, index) => {
            const existing = baseMap.get(id);
            if (existing) {
                const icon = { ...existing };
                if (typeof icon.order !== 'number') {
                    maxOrder += 1;
                    icon.order = maxOrder;
                }
                if (typeof icon.addedAt !== 'number') {
                    icon.addedAt = now + index;
                }
                if (typeof icon.customName !== 'string') {
                    icon.customName = '';
                }
                return icon;
            }
            maxOrder += 1;
            return {
                id,
                order: maxOrder,
                customName: '',
                addedAt: now + index,
            };
        });

        icons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        icons.forEach((icon, index) => {
            icon.order = index;
        });

        const sortMode = options.sortMode ?? (baseLayout?.sortMode || 'custom');
        if (sortMode && sortMode !== 'custom' || options.forceSort) {
            const sorted = this.sortIcons(sortMode, icons);
            sorted.forEach((icon, index) => {
                icon.order = index;
            });
            return { layout: { icons: sorted, sortMode } };
        }

        return { layout: { icons, sortMode } };
    };

    syncDesktopLayout = (ids, options = {}) => {
        const targetIds = Array.isArray(ids) ? ids : this.state.desktop_apps;
        const usePending = options.usePending && this.pendingLayout;
        const baseLayout = usePending ? this.pendingLayout : this.state.desktopLayout;
        const sortMode = options.sortMode ?? (usePending ? this.pendingLayout.sortMode : baseLayout?.sortMode) ?? 'custom';
        const { layout } = this.reconcileDesktopLayout(targetIds, baseLayout, {
            sortMode,
            forceSort: options.forceSort,
        });
        if (this.isLayoutChanged(this.state.desktopLayout, layout)) {
            this.setState({ desktopLayout: layout }, this.persistDesktopLayout);
        } else if (usePending) {
            // ensure state syncs with persisted layout when first loaded
            this.setState({ desktopLayout: layout });
        }
        if (usePending) {
            this.pendingLayout = null;
        }
    };

    getOrderedDesktopIcons = () => {
        const layoutIcons = Array.isArray(this.state.desktopLayout?.icons) ? this.state.desktopLayout.icons : [];
        const allowed = new Set(this.state.desktop_apps);
        return layoutIcons
            .filter((icon) => allowed.has(icon.id))
            .map((icon) => ({
                ...icon,
                app: this.getAppById(icon.id),
            }))
            .filter((item) => item.app)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    };

    getGridRowCapacity = () => {
        const grid = this.desktopGridRef.current;
        if (grid) {
            const height = grid.clientHeight || 0;
            const rows = Math.max(1, Math.floor((height - GRID_PADDING_Y * 2 + GRID_GAP_Y) / (GRID_ICON_HEIGHT + GRID_GAP_Y)));
            return rows;
        }
        if (typeof window !== 'undefined') {
            const height = window.innerHeight - GRID_PADDING_Y * 2;
            const rows = Math.max(1, Math.floor((height + GRID_GAP_Y) / (GRID_ICON_HEIGHT + GRID_GAP_Y)));
            return rows;
        }
        return 1;
    };

    handleGridDragOver = (e) => {
        if (!this.draggingDesktopApp) return;
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }
    };

    handleGridDrop = (e) => {
        if (!this.draggingDesktopApp) return;
        e.preventDefault();
        const grid = this.desktopGridRef.current;
        const rect = grid ? grid.getBoundingClientRect() : { left: 0, top: 0 };
        const clientX = typeof e.clientX === 'number' ? e.clientX : e.pageX || 0;
        const clientY = typeof e.clientY === 'number' ? e.clientY : e.pageY || 0;
        const relativeX = clientX - rect.left - GRID_PADDING_X;
        const relativeY = clientY - rect.top - GRID_PADDING_Y;
        const rows = this.getGridRowCapacity();
        const columnWidth = GRID_ICON_WIDTH + GRID_GAP_X;
        const rowHeight = GRID_ICON_HEIGHT + GRID_GAP_Y;
        const column = Math.max(0, Math.round(relativeX / columnWidth));
        const row = Math.max(0, Math.round(relativeY / rowHeight));
        const length = this.state.desktopLayout?.icons?.length || 0;
        const rawIndex = column * rows + row;
        const targetIndex = Math.max(0, Math.min(rawIndex, length));
        const id = this.draggingDesktopApp;
        this.draggingDesktopApp = null;
        this.moveIconToIndex(id, targetIndex);
    };

    moveIconToIndex = (id, targetIndex) => {
        this.setState((prevState) => {
            const layout = prevState.desktopLayout ? { ...prevState.desktopLayout } : this.getDefaultDesktopLayout();
            const icons = Array.isArray(layout.icons) ? layout.icons.map((icon) => ({ ...icon })) : [];
            const currentIndex = icons.findIndex((icon) => icon.id === id);
            if (currentIndex === -1) return null;
            const [moved] = icons.splice(currentIndex, 1);
            const clampedIndex = Math.max(0, Math.min(targetIndex, icons.length));
            icons.splice(clampedIndex, 0, moved);
            icons.forEach((icon, index) => {
                icon.order = index;
            });
            layout.icons = icons;
            layout.sortMode = 'custom';
            return { desktopLayout: layout, selectedDesktopApp: id };
        }, this.persistDesktopLayout);
    };

    handleIconDragStart = (id) => {
        this.draggingDesktopApp = id;
        this.setState({ selectedDesktopApp: id });
    };

    handleIconDragEnd = () => {
        this.draggingDesktopApp = null;
    };

    handleIconSelect = (id) => {
        if (this.state.renamingDesktopApp && this.state.renamingDesktopApp !== id) {
            this.submitRename();
        }
        this.setState({ selectedDesktopApp: id });
    };

    handleDesktopAreaClick = (e) => {
        const appNode = e.target.closest('[data-app-id]');
        if (appNode) return;
        if (this.state.renamingDesktopApp) {
            this.submitRename();
        } else {
            this.setState({ selectedDesktopApp: null });
        }
    };

    startRename = (id) => {
        const icons = Array.isArray(this.state.desktopLayout?.icons) ? this.state.desktopLayout.icons : [];
        const icon = icons.find((item) => item.id === id);
        const app = this.getAppById(id);
        if (!icon || !app) return;
        const displayName = icon.customName || app.title || id;
        this.setState({
            renamingDesktopApp: id,
            renameDraft: displayName,
            selectedDesktopApp: id,
        });
    };

    handleRenameChange = (value) => {
        this.setState({ renameDraft: value });
    };

    submitRename = () => {
        const id = this.state.renamingDesktopApp;
        if (!id) return;
        const value = this.state.renameDraft;
        let updated = false;
        this.setState((prevState) => {
            const layout = prevState.desktopLayout ? { ...prevState.desktopLayout } : this.getDefaultDesktopLayout();
            const icons = Array.isArray(layout.icons) ? layout.icons.map((icon) => ({ ...icon })) : [];
            const index = icons.findIndex((icon) => icon.id === id);
            if (index === -1) {
                return {
                    renamingDesktopApp: null,
                    renameDraft: '',
                };
            }
            const app = this.getAppById(id);
            const previousName = icons[index].customName || '';
            const trimmed = value.trim();
            const baseName = app?.title || id;
            const normalized = trimmed && trimmed !== baseName ? trimmed : '';
            if (previousName === normalized) {
                return {
                    renamingDesktopApp: null,
                    renameDraft: '',
                    selectedDesktopApp: id,
                };
            }
            icons[index].customName = normalized;
            let updatedIcons = icons;
            if (layout.sortMode && layout.sortMode !== 'custom') {
                updatedIcons = this.sortIcons(layout.sortMode, icons);
            }
            updatedIcons.forEach((icon, order) => {
                icon.order = order;
            });
            layout.icons = updatedIcons;
            const history = [...prevState.renameHistory, { id, previousName }];
            updated = true;
            return {
                desktopLayout: layout,
                renamingDesktopApp: null,
                renameDraft: '',
                renameHistory: history.slice(-50),
                selectedDesktopApp: id,
            };
        }, () => {
            if (updated) this.persistDesktopLayout();
        });
    };

    cancelRename = () => {
        const id = this.state.renamingDesktopApp;
        if (!id) {
            this.setState({ renamingDesktopApp: null, renameDraft: '' });
            return;
        }
        this.setState({
            renamingDesktopApp: null,
            renameDraft: '',
            selectedDesktopApp: id,
        });
    };

    undoLastRename = () => {
        if (!this.state.renameHistory.length) return false;
        let reverted = false;
        this.setState((prevState) => {
            if (!prevState.renameHistory.length) return null;
            const history = [...prevState.renameHistory];
            const last = history.pop();
            if (!last) return { renameHistory: history };
            const layout = prevState.desktopLayout ? { ...prevState.desktopLayout } : this.getDefaultDesktopLayout();
            const icons = Array.isArray(layout.icons) ? layout.icons.map((icon) => ({ ...icon })) : [];
            const index = icons.findIndex((icon) => icon.id === last.id);
            if (index === -1) {
                return { renameHistory: history };
            }
            icons[index].customName = last.previousName || '';
            let updatedIcons = icons;
            if (layout.sortMode && layout.sortMode !== 'custom') {
                updatedIcons = this.sortIcons(layout.sortMode, icons);
            }
            updatedIcons.forEach((icon, order) => {
                icon.order = order;
            });
            layout.icons = updatedIcons;
            reverted = true;
            return {
                desktopLayout: layout,
                renameHistory: history,
                selectedDesktopApp: last.id,
            };
        }, () => {
            if (reverted) this.persistDesktopLayout();
        });
        return reverted;
    };

    handleSortChange = (mode) => {
        if (!mode) return;
        this.syncDesktopLayout(this.state.desktop_apps, { sortMode: mode, forceSort: true });
    };

    commitWorkspacePartial = (partial, index) => {
        const targetIndex = typeof index === 'number' ? index : this.state.activeWorkspace;
        const snapshot = this.workspaceSnapshots[targetIndex] || this.createEmptyWorkspaceState();
        const nextSnapshot = { ...snapshot };
        Object.entries(partial).forEach(([key, value]) => {
            if (this.workspaceKeys.has(key)) {
                nextSnapshot[key] = value;
            }
        });
        this.workspaceSnapshots[targetIndex] = nextSnapshot;
    };

    setWorkspaceState = (updater, callback) => {
        if (typeof updater === 'function') {
            this.setState((prevState) => {
                const partial = updater(prevState);
                this.commitWorkspacePartial(partial, prevState.activeWorkspace);
                return partial;
            }, callback);
        } else {
            this.commitWorkspacePartial(updater);
            this.setState(updater, callback);
        }
    };

    getActiveStack = () => this.workspaceStacks[this.state.activeWorkspace];

    mergeWorkspaceMaps = (current = {}, base = {}, validKeys = null) => {
        const keys = validKeys
            ? Array.from(validKeys)
            : Array.from(new Set([...Object.keys(base), ...Object.keys(current)]));
        const merged = {};
        keys.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(current, key)) {
                merged[key] = current[key];
            } else if (Object.prototype.hasOwnProperty.call(base, key)) {
                merged[key] = base[key];
            }
        });
        return merged;
    };

    updateWorkspaceSnapshots = (baseState) => {
        const validKeys = new Set(Object.keys(baseState.closed_windows || {}));
        this.workspaceSnapshots = this.workspaceSnapshots.map((snapshot, index) => {
            const existing = snapshot || this.createEmptyWorkspaceState();
            if (index === this.state.activeWorkspace) {
                return this.cloneWorkspaceState(baseState);
            }
            return {
                focused_windows: this.mergeWorkspaceMaps(existing.focused_windows, baseState.focused_windows, validKeys),
                closed_windows: this.mergeWorkspaceMaps(existing.closed_windows, baseState.closed_windows, validKeys),
                overlapped_windows: this.mergeWorkspaceMaps(existing.overlapped_windows, baseState.overlapped_windows, validKeys),
                minimized_windows: this.mergeWorkspaceMaps(existing.minimized_windows, baseState.minimized_windows, validKeys),
                window_positions: this.mergeWorkspaceMaps(existing.window_positions, baseState.window_positions, validKeys),
                hideSideBar: existing.hideSideBar ?? baseState.hideSideBar ?? false,
            };
        });
    };

    getWorkspaceSummaries = () => {
        return this.state.workspaces.map((workspace) => {
            const snapshot = this.workspaceSnapshots[workspace.id] || this.createEmptyWorkspaceState();
            const openWindows = Object.values(snapshot.closed_windows || {}).filter((value) => value === false).length;
            return {
                id: workspace.id,
                label: workspace.label,
                openWindows,
            };
        });
    };

    switchWorkspace = (workspaceId) => {
        if (workspaceId === this.state.activeWorkspace) return;
        if (workspaceId < 0 || workspaceId >= this.state.workspaces.length) return;
        const snapshot = this.workspaceSnapshots[workspaceId] || this.createEmptyWorkspaceState();
        this.setState({
            activeWorkspace: workspaceId,
            focused_windows: { ...snapshot.focused_windows },
            closed_windows: { ...snapshot.closed_windows },
            overlapped_windows: { ...snapshot.overlapped_windows },
            minimized_windows: { ...snapshot.minimized_windows },
            window_positions: { ...snapshot.window_positions },
            hideSideBar: snapshot.hideSideBar ?? false,
            showWindowSwitcher: false,
            switcherWindows: [],
        }, () => {
            this.giveFocusToLastApp();
        });
    };

    shiftWorkspace = (direction) => {
        const { activeWorkspace, workspaces } = this.state;
        const count = workspaces.length;
        const next = (activeWorkspace + direction + count) % count;
        this.switchWorkspace(next);
    };

    componentDidMount() {
        this.refreshAppsIndex();
        this.pendingLayout = this.loadPersistedDesktopLayout();
        // google analytics
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        this.fetchAppsData(() => {
            const session = this.props.session || {};
            const positions = {};
            if (session.dock && session.dock.length) {
                let favourite_apps = { ...this.state.favourite_apps };
                session.dock.forEach(id => {
                    favourite_apps[id] = true;
                });
                this.setState({ favourite_apps });
            }

            if (session.windows && session.windows.length) {
                session.windows.forEach(({ id, x, y }) => {
                    positions[id] = { x, y };
                });
                this.setWorkspaceState({ window_positions: positions }, () => {
                    session.windows.forEach(({ id }) => this.openApp(id));
                });
            } else {
                this.openApp('about-alex');
            }
        });
        this.setContextListeners();
        this.setEventListeners();
        this.checkForNewFolders();
        this.checkForAppShortcuts();
        this.updateTrashIcon();
        window.addEventListener('trash-change', this.updateTrashIcon);
        document.addEventListener('keydown', this.handleGlobalShortcut);
        window.addEventListener('open-app', this.handleOpenAppEvent);
    }

    componentWillUnmount() {
        this.persistDesktopLayout();
        this.removeContextListeners();
        document.removeEventListener('keydown', this.handleGlobalShortcut);
        window.removeEventListener('trash-change', this.updateTrashIcon);
        window.removeEventListener('open-app', this.handleOpenAppEvent);
    }

    checkForNewFolders = () => {
        const stored = safeLocalStorage?.getItem('new_folders');
        if (!stored) {
            safeLocalStorage?.setItem('new_folders', JSON.stringify([]));
            return;
        }
        try {
            const new_folders = JSON.parse(stored);
            new_folders.forEach(folder => {
                apps.push({
                    id: `new-folder-${folder.id}`,
                    title: folder.name,
                    icon: '/themes/Yaru/system/folder.png',
                    disabled: true,
                    favourite: false,
                    desktop_shortcut: true,
                    screen: () => { },
                });
            });
            this.updateAppsData();
        } catch (e) {
            safeLocalStorage?.setItem('new_folders', JSON.stringify([]));
        }
    }

    setEventListeners = () => {
        const openSettings = document.getElementById("open-settings");
        if (openSettings) {
            openSettings.addEventListener("click", () => {
                this.openApp("settings");
            });
        }
    }

    setContextListeners = () => {
        document.addEventListener('contextmenu', this.checkContextMenu);
        // on click, anywhere, hide all menus
        document.addEventListener('click', this.hideAllContextMenu);
        // allow keyboard activation of context menus
        document.addEventListener('keydown', this.handleContextKey);
    }

    removeContextListeners = () => {
        document.removeEventListener("contextmenu", this.checkContextMenu);
        document.removeEventListener("click", this.hideAllContextMenu);
        document.removeEventListener('keydown', this.handleContextKey);
    }

    handleGlobalShortcut = (e) => {
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
            if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
            if (this.undoLastRename()) {
                e.preventDefault();
                return;
            }
        }
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            if (!this.state.showWindowSwitcher) {
                this.openWindowSwitcher();
            }
        } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            this.openApp('clipboard-manager');
        }
        else if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            this.cycleApps(e.shiftKey ? -1 : 1);
        }
        else if (e.altKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            this.cycleAppWindows(e.shiftKey ? -1 : 1);
        }
        else if (e.ctrlKey && e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            const direction = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
            this.shiftWorkspace(direction);
        }
        else if (e.metaKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            const id = this.getFocusedWindowId();
            if (id) {
                const event = new CustomEvent('super-arrow', { detail: e.key });
                document.getElementById(id)?.dispatchEvent(event);
            }
        }
    }

    getFocusedWindowId = () => {
        for (const key in this.state.focused_windows) {
            if (this.state.focused_windows[key]) {
                return key;
            }
        }
        return null;
    }

    cycleApps = (direction) => {
        const stack = this.getActiveStack();
        if (!stack.length) return;
        const currentId = this.getFocusedWindowId();
        let index = stack.indexOf(currentId);
        if (index === -1) index = 0;
        let next = (index + direction + stack.length) % stack.length;
        // Skip minimized windows
        for (let i = 0; i < stack.length; i++) {
            const id = stack[next];
            if (!this.state.minimized_windows[id]) {
                this.focus(id);
                break;
            }
            next = (next + direction + stack.length) % stack.length;
        }
    }

    cycleAppWindows = (direction) => {
        const currentId = this.getFocusedWindowId();
        if (!currentId) return;
        const base = currentId.split('#')[0];
        const windows = this.getActiveStack().filter(id => id.startsWith(base));
        if (windows.length <= 1) return;
        let index = windows.indexOf(currentId);
        let next = (index + direction + windows.length) % windows.length;
        this.focus(windows[next]);
    }

    openWindowSwitcher = () => {
        const windows = this.getActiveStack()
            .filter(id => this.state.closed_windows[id] === false)
            .map(id => apps.find(a => a.id === id))
            .filter(Boolean);
        if (windows.length) {
            this.setState({ showWindowSwitcher: true, switcherWindows: windows });
        }
    }

    closeWindowSwitcher = () => {
        this.setState({ showWindowSwitcher: false, switcherWindows: [] });
    }

    selectWindow = (id) => {
        this.setState({ showWindowSwitcher: false, switcherWindows: [] }, () => {
            this.openApp(id);
        });
    }

    checkContextMenu = (e) => {
        e.preventDefault();
        this.hideAllContextMenu();
        const target = e.target.closest('[data-context]');
        const context = target ? target.dataset.context : null;
        const appId = target ? target.dataset.appId : null;
        switch (context) {
            case "desktop-area":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Desktop Context Menu`
                });
                this.showContextMenu(e, "desktop");
                break;
            case "app":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened App Context Menu`
                });
                this.setState({ context_app: appId }, () => this.showContextMenu(e, "app"));
                break;
            case "taskbar":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Taskbar Context Menu`
                });
                this.setState({ context_app: appId }, () => this.showContextMenu(e, "taskbar"));
                break;
            default:
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Default Context Menu`
                });
                this.showContextMenu(e, "default");
        }
    }

    handleContextKey = (e) => {
        if (!(e.shiftKey && e.key === 'F10')) return;
        e.preventDefault();
        this.hideAllContextMenu();
        const target = e.target.closest('[data-context]');
        const context = target ? target.dataset.context : null;
        const appId = target ? target.dataset.appId : null;
        const rect = target ? target.getBoundingClientRect() : { left: 0, top: 0, height: 0 };
        const fakeEvent = { pageX: rect.left, pageY: rect.top + rect.height };
        switch (context) {
            case "desktop-area":
                ReactGA.event({ category: `Context Menu`, action: `Opened Desktop Context Menu` });
                this.showContextMenu(fakeEvent, "desktop");
                break;
            case "app":
                ReactGA.event({ category: `Context Menu`, action: `Opened App Context Menu` });
                this.setState({ context_app: appId }, () => this.showContextMenu(fakeEvent, "app"));
                break;
            case "taskbar":
                ReactGA.event({ category: `Context Menu`, action: `Opened Taskbar Context Menu` });
                this.setState({ context_app: appId }, () => this.showContextMenu(fakeEvent, "taskbar"));
                break;
            default:
                ReactGA.event({ category: `Context Menu`, action: `Opened Default Context Menu` });
                this.showContextMenu(fakeEvent, "default");
        }
    }

    showContextMenu = (e, menuName /* context menu name */) => {
        let { posx, posy } = this.getMenuPosition(e);
        let contextMenu = document.getElementById(`${menuName}-menu`);

        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;
        if (posx + menuWidth > window.innerWidth) posx -= menuWidth;
        if (posy + menuHeight > window.innerHeight) posy -= menuHeight;

        posx = posx.toString() + "px";
        posy = posy.toString() + "px";

        contextMenu.style.left = posx;
        contextMenu.style.top = posy;

        this.setState({ context_menus: { ...this.state.context_menus, [menuName]: true } });
    }

    hideAllContextMenu = () => {
        const menus = { ...this.state.context_menus };
        Object.keys(menus).forEach(key => {
            menus[key] = false;
        });
        this.setState({ context_menus: menus, context_app: null });
    }

    getMenuPosition = (e) => {
        var posx = 0;
        var posy = 0;

        if (!e) e = window.event;

        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        } else if (e.clientX || e.clientY) {
            posx = e.clientX + document.body.scrollLeft +
                document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop +
                document.documentElement.scrollTop;
        }
        return {
            posx, posy
        }
    }

    fetchAppsData = (callback) => {
        let pinnedApps = safeLocalStorage?.getItem('pinnedApps');
        if (pinnedApps) {
            pinnedApps = JSON.parse(pinnedApps);
            apps.forEach(app => { app.favourite = pinnedApps.includes(app.id); });
        } else {
            pinnedApps = apps.filter(app => app.favourite).map(app => app.id);
            safeLocalStorage?.setItem('pinnedApps', JSON.stringify(pinnedApps));
        }
        let focused_windows = {}, closed_windows = {}, disabled_apps = {}, favourite_apps = {}, overlapped_windows = {}, minimized_windows = {};
        let desktop_apps = [];
        apps.forEach((app) => {
            focused_windows = {
                ...focused_windows,
                [app.id]: false,
            };
            closed_windows = {
                ...closed_windows,
                [app.id]: true,
            };
            disabled_apps = {
                ...disabled_apps,
                [app.id]: app.disabled,
            };
            favourite_apps = {
                ...favourite_apps,
                [app.id]: app.favourite,
            };
            overlapped_windows = {
                ...overlapped_windows,
                [app.id]: false,
            };
            minimized_windows = {
                ...minimized_windows,
                [app.id]: false,
            }
            if (app.desktop_shortcut) desktop_apps.push(app.id);
        });
        this.refreshAppsIndex();
        const workspaceState = {
            focused_windows,
            closed_windows,
            overlapped_windows,
            minimized_windows,
            window_positions: this.state.window_positions,
            hideSideBar: this.state.hideSideBar,
        };
        this.updateWorkspaceSnapshots(workspaceState);
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
        this.setWorkspaceState({
            ...workspaceState,
            disabled_apps,
            favourite_apps,
            desktop_apps
        }, () => {
            this.syncDesktopLayout(desktop_apps, { usePending: true });
            if (typeof callback === 'function') callback();
        });
        this.initFavourite = { ...favourite_apps };
    }

    updateAppsData = () => {
        let focused_windows = {}, closed_windows = {}, favourite_apps = {}, minimized_windows = {}, disabled_apps = {}, overlapped_windows = {};
        let desktop_apps = [];
        apps.forEach((app) => {
            focused_windows = {
                ...focused_windows,
                [app.id]: ((this.state.focused_windows[app.id] !== undefined || this.state.focused_windows[app.id] !== null) ? this.state.focused_windows[app.id] : false),
            };
            minimized_windows = {
                ...minimized_windows,
                [app.id]: ((this.state.minimized_windows[app.id] !== undefined || this.state.minimized_windows[app.id] !== null) ? this.state.minimized_windows[app.id] : false)
            };
            disabled_apps = {
                ...disabled_apps,
                [app.id]: app.disabled
            };
            closed_windows = {
                ...closed_windows,
                [app.id]: ((this.state.closed_windows[app.id] !== undefined || this.state.closed_windows[app.id] !== null) ? this.state.closed_windows[app.id] : true)
            };
            overlapped_windows = {
                ...overlapped_windows,
                [app.id]: ((this.state.overlapped_windows[app.id] !== undefined || this.state.overlapped_windows[app.id] !== null) ? this.state.overlapped_windows[app.id] : false)
            };
            favourite_apps = {
                ...favourite_apps,
                [app.id]: app.favourite
            }
            if (app.desktop_shortcut) desktop_apps.push(app.id);
        });
        this.refreshAppsIndex();
        const workspaceState = {
            focused_windows,
            closed_windows,
            overlapped_windows,
            minimized_windows,
            window_positions: this.state.window_positions,
            hideSideBar: this.state.hideSideBar,
        };
        this.updateWorkspaceSnapshots(workspaceState);
        this.setWorkspaceState({
            ...workspaceState,
            disabled_apps,
            favourite_apps,
            desktop_apps
        }, () => this.syncDesktopLayout(desktop_apps));
        this.initFavourite = { ...favourite_apps };
    }

    renderDesktopApps = () => {
        if (Object.keys(this.state.closed_windows).length === 0) return null;
        const icons = this.getOrderedDesktopIcons();
        if (!icons.length) return null;
        return (
            <div
                id="desktop-grid"
                ref={this.desktopGridRef}
                data-context="desktop-area"
                className="absolute inset-0"
                onDragOver={this.handleGridDragOver}
                onDrop={this.handleGridDrop}
                onMouseDown={this.handleDesktopAreaClick}
            >
                <div
                    data-context="desktop-area"
                    className="w-full h-full"
                    style={{
                        display: 'grid',
                        gridAutoFlow: 'column',
                        gridAutoColumns: `${GRID_ICON_WIDTH}px`,
                        gridAutoRows: `${GRID_ICON_HEIGHT}px`,
                        columnGap: `${GRID_GAP_X}px`,
                        rowGap: `${GRID_GAP_Y}px`,
                        alignContent: 'start',
                        justifyContent: 'start',
                        padding: `${GRID_PADDING_Y}px ${GRID_PADDING_X}px`,
                    }}
                >
                    {icons.map(({ id, app, customName }) => (
                        <UbuntuApp
                            key={id}
                            name={app.title}
                            id={id}
                            icon={app.icon}
                            openApp={this.openApp}
                            disabled={this.state.disabled_apps[id]}
                            prefetch={app.screen?.prefetch}
                            displayName={customName ? customName : undefined}
                            selected={this.state.selectedDesktopApp === id}
                            renaming={this.state.renamingDesktopApp === id}
                            renameValue={this.state.renamingDesktopApp === id ? this.state.renameDraft : ''}
                            onRenameChange={this.handleRenameChange}
                            onRenameSubmit={this.submitRename}
                            onRenameCancel={this.cancelRename}
                            onSelect={() => this.handleIconSelect(id)}
                            onDragStart={this.handleIconDragStart}
                            onDragEnd={this.handleIconDragEnd}
                            onRequestRename={this.startRename}
                        />
                    ))}
                </div>
            </div>
        );
    }

    renderWindows = () => {
        let windowsJsx = [];
        apps.forEach((app, index) => {
            if (this.state.closed_windows[app.id] === false) {

                const pos = this.state.window_positions[app.id];
                const props = {
                    title: app.title,
                    id: app.id,
                    screen: app.screen,
                    addFolder: this.addToDesktop,
                    closed: this.closeApp,
                    openApp: this.openApp,
                    focus: this.focus,
                    isFocused: this.state.focused_windows[app.id],
                    hideSideBar: this.hideSideBar,
                    hasMinimised: this.hasMinimised,
                    minimized: this.state.minimized_windows[app.id],
                    resizable: app.resizable,
                    allowMaximize: app.allowMaximize,
                    defaultWidth: app.defaultWidth,
                    defaultHeight: app.defaultHeight,
                    initialX: pos ? pos.x : undefined,
                    initialY: pos ? pos.y : undefined,
                    onPositionChange: (x, y) => this.updateWindowPosition(app.id, x, y),
                    snapEnabled: this.props.snapEnabled,
                    context: this.state.window_context[app.id],
                }

                windowsJsx.push(
                    <Window key={app.id} {...props} />
                )
            }
        });
        return windowsJsx;
    }

    updateWindowPosition = (id, x, y) => {
        const snap = this.props.snapEnabled
            ? (v) => Math.round(v / 8) * 8
            : (v) => v;
        this.setWorkspaceState(prev => ({
            window_positions: { ...prev.window_positions, [id]: { x: snap(x), y: snap(y) } }
        }), this.saveSession);
    }

    saveSession = () => {
        if (!this.props.setSession) return;
        const openWindows = Object.keys(this.state.closed_windows).filter(id => this.state.closed_windows[id] === false);
        const windows = openWindows.map(id => ({
            id,
            x: this.state.window_positions[id] ? this.state.window_positions[id].x : 60,
            y: this.state.window_positions[id] ? this.state.window_positions[id].y : 10
        }));
        const dock = Object.keys(this.state.favourite_apps).filter(id => this.state.favourite_apps[id]);
        this.props.setSession({ ...this.props.session, windows, dock });
    }

    hideSideBar = (objId, hide) => {
        if (hide === this.state.hideSideBar) return;

        if (objId === null) {
            if (hide === false) {
                this.setState({ hideSideBar: false });
            }
            else {
                for (const key in this.state.overlapped_windows) {
                    if (this.state.overlapped_windows[key]) {
                        this.setState({ hideSideBar: true });
                        return;
                    }  // if any window is overlapped then hide the SideBar
                }
            }
            return;
        }

        if (hide === false) {
            for (const key in this.state.overlapped_windows) {
                if (this.state.overlapped_windows[key] && key !== objId) return; // if any window is overlapped then don't show the SideBar
            }
        }

        let overlapped_windows = this.state.overlapped_windows;
        overlapped_windows[objId] = hide;
        this.setWorkspaceState({ hideSideBar: hide, overlapped_windows });
    }

    hasMinimised = (objId) => {
        let minimized_windows = this.state.minimized_windows;
        var focused_windows = this.state.focused_windows;

        // remove focus and minimise this window
        minimized_windows[objId] = true;
        focused_windows[objId] = false;
        this.setWorkspaceState({ minimized_windows, focused_windows });

        this.hideSideBar(null, false);

        this.giveFocusToLastApp();
    }

    giveFocusToLastApp = () => {
        // if there is atleast one app opened, give it focus
        if (!this.checkAllMinimised()) {
            const stack = this.getActiveStack();
            for (let index = 0; index < stack.length; index++) {
                if (!this.state.minimized_windows[stack[index]]) {
                    this.focus(stack[index]);
                    break;
                }
            }
        }
    }

    checkAllMinimised = () => {
        let result = true;
        for (const key in this.state.minimized_windows) {
            if (!this.state.closed_windows[key]) { // if app is opened
                result = result & this.state.minimized_windows[key];
            }
        }
        return result;
    }

    handleOpenAppEvent = (e) => {
        const detail = e.detail;
        if (!detail) return;
        if (typeof detail === 'string') {
            this.openApp(detail);
            return;
        }
        if (typeof detail === 'object' && detail.id) {
            const { id, ...context } = detail;
            this.openApp(id, context);
        }
    }

    openApp = (objId, params) => {
        const context = params && typeof params === 'object'
            ? {
                ...params,
                ...(params.path && !params.initialPath ? { initialPath: params.path } : {}),
            }
            : undefined;
        const contextState = context
            ? { ...this.state.window_context, [objId]: context }
            : this.state.window_context;


        // google analytics
        ReactGA.event({
            category: `Open App`,
            action: `Opened ${objId} window`
        });

        // if the app is disabled
        if (this.state.disabled_apps[objId]) return;

        // if app is already open, focus it instead of spawning a new window
        if (this.state.closed_windows[objId] === false) {
            // if it's minimised, restore its last position
            if (this.state.minimized_windows[objId]) {
                this.focus(objId);
                var r = document.querySelector("#" + objId);
                r.style.transform = `translate(${r.style.getPropertyValue("--window-transform-x")},${r.style.getPropertyValue("--window-transform-y")}) scale(1)`;
                let minimized_windows = this.state.minimized_windows;
                minimized_windows[objId] = false;
                this.setWorkspaceState({ minimized_windows }, this.saveSession);

            }

            const reopen = () => {
                // if it's minimised, restore its last position
                if (this.state.minimized_windows[objId]) {
                    this.focus(objId);
                    var r = document.querySelector("#" + objId);
                    r.style.transform = `translate(${r.style.getPropertyValue("--window-transform-x")},${r.style.getPropertyValue("--window-transform-y")}) scale(1)`;
                    let minimized_windows = this.state.minimized_windows;
                    minimized_windows[objId] = false;
                    this.setState({ minimized_windows: minimized_windows }, this.saveSession);
                } else {
                    this.focus(objId);
                    this.saveSession();
                }
            };
            if (context) {
                this.setState({ window_context: contextState }, reopen);
            } else {
                reopen();
            }
            return;
        } else {
            let closed_windows = this.state.closed_windows;
            let favourite_apps = this.state.favourite_apps;
            let frequentApps = [];
            try { frequentApps = JSON.parse(safeLocalStorage?.getItem('frequentApps') || '[]'); } catch (e) { frequentApps = []; }
            var currentApp = frequentApps.find(app => app.id === objId);
            if (currentApp) {
                frequentApps.forEach((app) => {
                    if (app.id === currentApp.id) {
                        app.frequency += 1; // increase the frequency if app is found 
                    }
                });
            } else {
                frequentApps.push({ id: objId, frequency: 1 }); // new app opened
            }

            frequentApps.sort((a, b) => {
                if (a.frequency < b.frequency) {
                    return 1;
                }
                if (a.frequency > b.frequency) {
                    return -1;
                }
                return 0; // sort according to decreasing frequencies
            });

            safeLocalStorage?.setItem('frequentApps', JSON.stringify(frequentApps));

            addRecentApp(objId);

            setTimeout(() => {
                favourite_apps[objId] = true; // adds opened app to sideBar
                closed_windows[objId] = false; // openes app's window
                this.setWorkspaceState({ closed_windows, favourite_apps, allAppsView: false }, () => {
                    const nextState = { closed_windows, favourite_apps, allAppsView: false };
                    if (context) {
                        nextState.window_context = contextState;
                    }
                    this.setState(nextState, () => {
                        this.focus(objId);
                        this.saveSession();
                    });
                    this.getActiveStack().push(objId);
                });
            }, 200);
        }
    }

    closeApp = async (objId) => {

        // capture window snapshot
        let image = null;
        const node = document.getElementById(objId);
        if (node) {
            try {
                image = await toPng(node);
            } catch (e) {
                // ignore snapshot errors
            }
        }

        // persist in trash with autopurge
        const appMeta = apps.find(a => a.id === objId) || {};
        const purgeDays = parseInt(safeLocalStorage?.getItem('trash-purge-days') || '30', 10);
        const ms = purgeDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let trash = [];
        try { trash = JSON.parse(safeLocalStorage?.getItem('window-trash') || '[]'); } catch (e) { trash = []; }
        trash = trash.filter(item => now - item.closedAt <= ms);
        trash.push({
            id: objId,
            title: appMeta.title || objId,
            icon: appMeta.icon,
            image,
            closedAt: now,
        });
        safeLocalStorage?.setItem('window-trash', JSON.stringify(trash));
        this.updateTrashIcon();

        // remove app from the app stack
        const stack = this.getActiveStack();
        const index = stack.indexOf(objId);
        if (index !== -1) {
            stack.splice(index, 1);
        }

        this.giveFocusToLastApp();

        this.hideSideBar(null, false);

        // close window
        let closed_windows = this.state.closed_windows;
        let favourite_apps = this.state.favourite_apps;

        if (this.initFavourite[objId] === false) favourite_apps[objId] = false; // if user default app is not favourite, remove from sidebar
        closed_windows[objId] = true; // closes the app's window

        this.setWorkspaceState({ closed_windows, favourite_apps }, this.saveSession);

        const window_context = { ...this.state.window_context };
        delete window_context[objId];
        this.setState({ closed_windows, favourite_apps, window_context }, this.saveSession);
    }

    pinApp = (id) => {
        let favourite_apps = { ...this.state.favourite_apps }
        favourite_apps[id] = true
        this.initFavourite[id] = true
        const app = apps.find(a => a.id === id)
        if (app) app.favourite = true
        let pinnedApps = [];
        try { pinnedApps = JSON.parse(safeLocalStorage?.getItem('pinnedApps') || '[]'); } catch (e) { pinnedApps = []; }
        if (!pinnedApps.includes(id)) pinnedApps.push(id)
        safeLocalStorage?.setItem('pinnedApps', JSON.stringify(pinnedApps))
        this.setState({ favourite_apps }, () => { this.saveSession(); })
        this.hideAllContextMenu()
    }

    unpinApp = (id) => {
        let favourite_apps = { ...this.state.favourite_apps }
        if (this.state.closed_windows[id]) favourite_apps[id] = false
        this.initFavourite[id] = false
        const app = apps.find(a => a.id === id)
        if (app) app.favourite = false
        let pinnedApps = [];
        try { pinnedApps = JSON.parse(safeLocalStorage?.getItem('pinnedApps') || '[]'); } catch (e) { pinnedApps = []; }
        pinnedApps = pinnedApps.filter(appId => appId !== id)
        safeLocalStorage?.setItem('pinnedApps', JSON.stringify(pinnedApps))
        this.setState({ favourite_apps }, () => { this.saveSession(); })
        this.hideAllContextMenu()
    }

    focus = (objId) => {
        // removes focus from all window and 
        // gives focus to window with 'id = objId'
        var focused_windows = this.state.focused_windows;
        focused_windows[objId] = true;
        for (let key in focused_windows) {
            if (focused_windows.hasOwnProperty(key)) {
                if (key !== objId) {
                    focused_windows[key] = false;
                }
            }
        }
        this.setWorkspaceState({ focused_windows });
    }

    addNewFolder = () => {
        this.setState({ showNameBar: true });
    }

    openShortcutSelector = () => {
        this.setState({ showShortcutSelector: true });
    }

    addShortcutToDesktop = (app_id) => {
        const appIndex = apps.findIndex(app => app.id === app_id);
        if (appIndex === -1) return;
        apps[appIndex].desktop_shortcut = true;
        let shortcuts = [];
        try { shortcuts = JSON.parse(safeLocalStorage?.getItem('app_shortcuts') || '[]'); } catch (e) { shortcuts = []; }
        if (!shortcuts.includes(app_id)) {
            shortcuts.push(app_id);
            safeLocalStorage?.setItem('app_shortcuts', JSON.stringify(shortcuts));
        }
        this.setState({ showShortcutSelector: false }, this.updateAppsData);
    }

    checkForAppShortcuts = () => {
        const shortcuts = safeLocalStorage?.getItem('app_shortcuts');
        if (!shortcuts) {
            safeLocalStorage?.setItem('app_shortcuts', JSON.stringify([]));
        } else {
            try {
                JSON.parse(shortcuts).forEach(id => {
                    const appIndex = apps.findIndex(app => app.id === id);
                    if (appIndex !== -1) {
                        apps[appIndex].desktop_shortcut = true;
                    }
                });
            } catch (e) {
                safeLocalStorage?.setItem('app_shortcuts', JSON.stringify([]));
            }
            this.updateAppsData();
        }
    }

    updateTrashIcon = () => {
        let trash = [];
        try { trash = JSON.parse(safeLocalStorage?.getItem('window-trash') || '[]'); } catch (e) { trash = []; }
        const appIndex = apps.findIndex(app => app.id === 'trash');
        if (appIndex !== -1) {
            const icon = trash.length
                ? '/themes/Yaru/status/user-trash-full-symbolic.svg'
                : '/themes/Yaru/status/user-trash-symbolic.svg';
            if (apps[appIndex].icon !== icon) {
                apps[appIndex].icon = icon;
                this.forceUpdate();
            }
        }
    }

    addToDesktop = (folder_name) => {
        folder_name = folder_name.trim();
        let folder_id = folder_name.replace(/\s+/g, '-').toLowerCase();
        apps.push({
            id: `new-folder-${folder_id}`,
            title: folder_name,
            icon: '/themes/Yaru/system/folder.png',
            disabled: true,
            favourite: false,
            desktop_shortcut: true,
            screen: () => { },
        });
        // store in local storage
        let new_folders = [];
        try { new_folders = JSON.parse(safeLocalStorage?.getItem('new_folders') || '[]'); } catch (e) { new_folders = []; }
        new_folders.push({ id: `new-folder-${folder_id}`, name: folder_name });
        safeLocalStorage?.setItem('new_folders', JSON.stringify(new_folders));

        this.setState({ showNameBar: false }, this.updateAppsData);
    };

    showAllApps = () => { this.setState({ allAppsView: !this.state.allAppsView }); };

    renderNameBar = () => {
        const addFolder = () => {
            let folder_name = document.getElementById("folder-name-input").value;
            this.addToDesktop(folder_name);
        };

        const removeCard = () => {
            this.setState({ showNameBar: false });
        };

        return (
            <div className="absolute rounded-md top-1/2 left-1/2 text-center text-white font-light text-sm bg-ub-cool-grey transform -translate-y-1/2 -translate-x-1/2 sm:w-96 w-3/4 z-50">
                <div className="w-full flex flex-col justify-around items-start pl-6 pb-8 pt-6">
                    <span>New folder name</span>
                    <input className="outline-none mt-5 px-1 w-10/12  context-menu-bg border-2 border-blue-700 rounded py-0.5" id="folder-name-input" type="text" autoComplete="off" spellCheck="false" autoFocus={true} />
                </div>
                <div className="flex">
                    <button
                        type="button"
                        onClick={addFolder}
                        aria-label="Create folder"
                        className="w-1/2 px-4 py-2 border border-gray-900 border-opacity-50 border-r-0 hover:bg-ub-warm-grey hover:bg-opacity-10 hover:border-opacity-50"
                    >
                        Create
                    </button>
                    <button
                        type="button"
                        onClick={removeCard}
                        aria-label="Cancel folder creation"
                        className="w-1/2 px-4 py-2 border border-gray-900 border-opacity-50 hover:bg-ub-warm-grey hover:bg-opacity-10 hover:border-opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    };

    render() {
        const workspaceSummaries = this.getWorkspaceSummaries();
        return (
            <main id="desktop" role="main" className={" h-full w-full flex flex-col items-end justify-start content-start flex-wrap-reverse pt-8 bg-transparent relative overflow-hidden overscroll-none window-parent"}>

                {/* Window Area */}
                <div
                    id="window-area"
                    role="main"
                    className="absolute h-full w-full bg-transparent"
                    data-context="desktop-area"
                >
                    {this.renderWindows()}
                </div>

                {/* Background Image */}
                <BackgroundImage />

                {/* Ubuntu Side Menu Bar */}
                <SideBar apps={apps}
                    hide={this.state.hideSideBar}
                    hideSideBar={this.hideSideBar}
                    favourite_apps={this.state.favourite_apps}
                    showAllApps={this.showAllApps}
                    allAppsView={this.state.allAppsView}
                    closed_windows={this.state.closed_windows}
                    focused_windows={this.state.focused_windows}
                    isMinimized={this.state.minimized_windows}
                    openAppByAppId={this.openApp} />

                {/* Taskbar */}
                <Taskbar
                    apps={apps}
                    closed_windows={this.state.closed_windows}
                    minimized_windows={this.state.minimized_windows}
                    focused_windows={this.state.focused_windows}
                    openApp={this.openApp}
                    minimize={this.hasMinimised}
                    workspaces={workspaceSummaries}
                    activeWorkspace={this.state.activeWorkspace}
                    onSelectWorkspace={this.switchWorkspace}
                />

                {/* Desktop Apps */}
                {this.renderDesktopApps()}

                {/* Context Menus */}
                <DesktopMenu
                    active={this.state.context_menus.desktop}
                    openApp={this.openApp}
                    addNewFolder={this.addNewFolder}
                    openShortcutSelector={this.openShortcutSelector}
                    sortMode={this.state.desktopLayout?.sortMode || 'custom'}
                    onChangeSort={this.handleSortChange}
                    canUndoRename={this.state.renameHistory.length > 0}
                    onUndoRename={this.undoLastRename}
                    clearSession={() => { this.props.clearSession(); window.location.reload(); }}
                />
                <DefaultMenu active={this.state.context_menus.default} onClose={this.hideAllContextMenu} />
                <AppMenu
                    active={this.state.context_menus.app}
                    pinned={this.initFavourite[this.state.context_app]}
                    pinApp={() => this.pinApp(this.state.context_app)}
                    unpinApp={() => this.unpinApp(this.state.context_app)}
                    onClose={this.hideAllContextMenu}
                />
                <TaskbarMenu
                    active={this.state.context_menus.taskbar}
                    minimized={this.state.context_app ? this.state.minimized_windows[this.state.context_app] : false}
                    onMinimize={() => {
                        const id = this.state.context_app;
                        if (!id) return;
                        if (this.state.minimized_windows[id]) {
                            this.openApp(id);
                        } else {
                            this.hasMinimised(id);
                        }
                    }}
                    onClose={() => {
                        const id = this.state.context_app;
                        if (!id) return;
                        this.closeApp(id);
                    }}
                    onCloseMenu={this.hideAllContextMenu}
                />

                {/* Folder Input Name Bar */}
                {
                    (this.state.showNameBar
                        ? this.renderNameBar()
                        : null
                    )
                }

                { this.state.allAppsView ?
                    <AllApplications apps={apps}
                        games={games}
                        recentApps={this.getActiveStack()}
                        openApp={this.openApp} /> : null}

                { this.state.showShortcutSelector ?
                    <ShortcutSelector apps={apps}
                        games={games}
                        onSelect={this.addShortcutToDesktop}
                        onClose={() => this.setState({ showShortcutSelector: false })} /> : null}

                { this.state.showWindowSwitcher ?
                    <WindowSwitcher
                        windows={this.state.switcherWindows}
                        onSelect={this.selectWindow}
                        onClose={this.closeWindowSwitcher} /> : null}

            </main>
        );
    }
}

export default function DesktopWithSnap(props) {
    const [snapEnabled] = useSnapSetting();
    return <Desktop {...props} snapEnabled={snapEnabled} />;
}
