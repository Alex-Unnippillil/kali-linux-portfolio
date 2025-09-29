"use client";

import React, { Component } from 'react';
import dynamic from 'next/dynamic';

const BackgroundImage = dynamic(
    () => import('../util-components/background-image'),
    { ssr: false }
);
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

class WindowManagerStore {
    constructor(workspaceCount = 1) {
        this.workspaceCount = workspaceCount;
        this.workspaces = Array.from({ length: workspaceCount }, () => this.createWorkspaceState());
    }

    createWorkspaceState() {
        return {
            order: [],
            focus: null,
            windows: {},
        };
    }

    ensureWorkspace(id) {
        if (!this.workspaces[id]) {
            this.workspaces[id] = this.createWorkspaceState();
        }
        return this.workspaces[id];
    }

    reset(workspaceCount = this.workspaceCount) {
        this.workspaceCount = workspaceCount;
        this.workspaces = Array.from({ length: workspaceCount }, () => this.createWorkspaceState());
    }

    bringToFront(workspace, id) {
        workspace.order = workspace.order.filter((item) => item !== id);
        workspace.order.push(id);
    }

    getKnownIds(workspace) {
        return Object.keys(workspace.windows);
    }

    snapshotWorkspace(workspaceId, removed = []) {
        const workspace = this.ensureWorkspace(workspaceId);
        const focused_windows = {};
        const minimized_windows = {};
        const window_snap_states = {};
        const knownIds = this.getKnownIds(workspace);
        knownIds.forEach((id) => {
            const windowState = workspace.windows[id] || {};
            focused_windows[id] = workspace.focus === id;
            minimized_windows[id] = !!windowState.minimized;
            window_snap_states[id] = windowState.snap ?? null;
        });
        return {
            focused_windows,
            minimized_windows,
            window_snap_states,
            window_z_order: [...workspace.order],
            knownIds,
            removed,
        };
    }

    ensureWindow(workspaceId, id) {
        const workspace = this.ensureWorkspace(workspaceId);
        if (!workspace.windows[id]) {
            workspace.windows[id] = { minimized: false, snap: null };
        }
        return workspace.windows[id];
    }

    findNextFocusable(workspace, excludeId = null) {
        for (let index = workspace.order.length - 1; index >= 0; index -= 1) {
            const candidate = workspace.order[index];
            if (candidate === excludeId) continue;
            const state = workspace.windows[candidate];
            if (state && !state.minimized) {
                return candidate;
            }
        }
        return null;
    }

    openWindow(workspaceId, id) {
        const workspace = this.ensureWorkspace(workspaceId);
        const windowState = this.ensureWindow(workspaceId, id);
        windowState.minimized = false;
        this.bringToFront(workspace, id);
        workspace.focus = id;
        return this.snapshotWorkspace(workspaceId);
    }

    focusWindow(workspaceId, id) {
        const workspace = this.ensureWorkspace(workspaceId);
        const windowState = this.ensureWindow(workspaceId, id);
        windowState.minimized = false;
        this.bringToFront(workspace, id);
        workspace.focus = id;
        return this.snapshotWorkspace(workspaceId);
    }

    minimizeWindow(workspaceId, id) {
        const workspace = this.ensureWorkspace(workspaceId);
        const windowState = this.ensureWindow(workspaceId, id);
        windowState.minimized = true;
        if (workspace.focus === id) {
            workspace.focus = this.findNextFocusable(workspace, id);
        }
        return this.snapshotWorkspace(workspaceId);
    }

    restoreWindow(workspaceId, id) {
        const workspace = this.ensureWorkspace(workspaceId);
        const windowState = this.ensureWindow(workspaceId, id);
        windowState.minimized = false;
        this.bringToFront(workspace, id);
        workspace.focus = id;
        return this.snapshotWorkspace(workspaceId);
    }

    closeWindow(workspaceId, id) {
        const workspace = this.ensureWorkspace(workspaceId);
        const removed = [];
        if (workspace.windows[id]) {
            delete workspace.windows[id];
            removed.push(id);
        }
        const index = workspace.order.indexOf(id);
        if (index !== -1) {
            workspace.order.splice(index, 1);
        }
        if (workspace.focus === id) {
            workspace.focus = this.findNextFocusable(workspace, id);
        }
        return this.snapshotWorkspace(workspaceId, removed);
    }

    focusNext(workspaceId) {
        const workspace = this.ensureWorkspace(workspaceId);
        workspace.focus = this.findNextFocusable(workspace);
        return this.snapshotWorkspace(workspaceId);
    }

    cycleFocus(workspaceId, direction = 1) {
        const workspace = this.ensureWorkspace(workspaceId);
        const openWindows = workspace.order.filter((id) => {
            const state = workspace.windows[id];
            return state && !state.minimized;
        });
        if (!openWindows.length) return null;
        const currentId = workspace.focus;
        let index = currentId ? openWindows.indexOf(currentId) : -1;
        if (index === -1) {
            index = direction > 0 ? -1 : 0;
        }
        const nextIndex = index === -1
            ? (direction > 0 ? 0 : openWindows.length - 1)
            : (index + direction + openWindows.length) % openWindows.length;
        const nextId = openWindows[nextIndex];
        if (!nextId) return null;
        return { focusedId: nextId, snapshot: this.focusWindow(workspaceId, nextId) };
    }

    cycleWithinApp(workspaceId, baseId, direction = 1) {
        const workspace = this.ensureWorkspace(workspaceId);
        const openWindows = workspace.order.filter(
            (id) => id.startsWith(baseId) && workspace.windows[id] && !workspace.windows[id].minimized
        );
        if (openWindows.length <= 1) return null;
        const currentId = workspace.focus;
        let index = currentId ? openWindows.indexOf(currentId) : -1;
        if (index === -1) {
            index = direction > 0 ? -1 : 0;
        }
        const nextId = openWindows[(index + direction + openWindows.length) % openWindows.length];
        if (!nextId) return null;
        return { focusedId: nextId, snapshot: this.focusWindow(workspaceId, nextId) };
    }

    setSnapState(workspaceId, id, position) {
        const workspace = this.ensureWorkspace(workspaceId);
        const windowState = this.ensureWindow(workspaceId, id);
        windowState.snap = position ?? null;
        return this.snapshotWorkspace(workspaceId);
    }

    getFocusedWindow(workspaceId) {
        const workspace = this.ensureWorkspace(workspaceId);
        return workspace.focus;
    }

    getOrder(workspaceId) {
        const workspace = this.ensureWorkspace(workspaceId);
        return [...workspace.order];
    }

    getSnapshotForWorkspace(workspaceId) {
        return this.snapshotWorkspace(workspaceId);
    }
}

export class Desktop extends Component {
    constructor() {
        super();
        this.workspaceCount = 4;
        this.windowManager = new WindowManagerStore(this.workspaceCount);
        this.workspaceSnapshots = Array.from({ length: this.workspaceCount }, () => this.createEmptyWorkspaceState());
        this.workspaceKeys = new Set([
            'focused_windows',
            'closed_windows',
            'minimized_windows',
            'window_positions',
            'window_z_order',
            'window_snap_states',
        ]);
        this.initFavourite = {};
        this.allWindowClosed = false;
        this.state = {
            focused_windows: {},
            closed_windows: {},
            allAppsView: false,
            disabled_apps: {},
            favourite_apps: {},
            minimized_windows: {},
            window_positions: {},
            window_z_order: [],
            window_snap_states: {},
            desktop_apps: [],
            desktop_icon_positions: {},
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
            draggingIconId: null,
        }

        this.desktopRef = React.createRef();
        this.iconDragState = null;
        this.preventNextIconClick = false;
        this.savedIconPositions = {};
        this.iconDimensions = { width: 96, height: 88 };
        this.iconGridSpacing = { row: 112, column: 128 };
        this.desktopPadding = { top: 64, right: 24, bottom: 120, left: 24 };
    }

    createEmptyWorkspaceState = () => ({
        focused_windows: {},
        closed_windows: {},
        minimized_windows: {},
        window_positions: {},
        window_z_order: [],
        window_snap_states: {},
    });

    cloneWorkspaceState = (state) => ({
        focused_windows: { ...state.focused_windows },
        closed_windows: { ...state.closed_windows },
        minimized_windows: { ...state.minimized_windows },
        window_positions: { ...state.window_positions },
        window_z_order: Array.isArray(state.window_z_order) ? [...state.window_z_order] : [],
        window_snap_states: { ...state.window_snap_states },
    });

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
            const existingOrder = Array.isArray(existing.window_z_order) ? existing.window_z_order : [];
            const filteredOrder = existingOrder.filter((id) => validKeys.has(id));
            return {
                focused_windows: this.mergeWorkspaceMaps(existing.focused_windows, baseState.focused_windows, validKeys),
                closed_windows: this.mergeWorkspaceMaps(existing.closed_windows, baseState.closed_windows, validKeys),
                minimized_windows: this.mergeWorkspaceMaps(existing.minimized_windows, baseState.minimized_windows, validKeys),
                window_positions: this.mergeWorkspaceMaps(existing.window_positions, baseState.window_positions, validKeys),
                window_snap_states: this.mergeWorkspaceMaps(existing.window_snap_states, baseState.window_snap_states, validKeys),
                window_z_order: filteredOrder,
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

    arraysEqual = (a = [], b = []) => {
        if (a === b) return true;
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        for (let index = 0; index < a.length; index += 1) {
            if (a[index] !== b[index]) return false;
        }
        return true;
    };

    buildWindowManagerPartial = (currentState, snapshot) => {
        if (!snapshot) return null;
        const nextFocused = { ...currentState.focused_windows };
        const nextMinimized = { ...currentState.minimized_windows };
        const nextSnap = { ...(currentState.window_snap_states || {}) };
        let changed = false;
        const { focused_windows = {}, minimized_windows = {}, window_snap_states = {}, knownIds = [], removed = [] } = snapshot;
        const knownSet = new Set(knownIds);
        knownSet.forEach((id) => {
            const focusValue = Object.prototype.hasOwnProperty.call(focused_windows, id)
                ? focused_windows[id]
                : false;
            if (nextFocused[id] !== focusValue) {
                nextFocused[id] = focusValue;
                changed = true;
            }
            const minimizedValue = Object.prototype.hasOwnProperty.call(minimized_windows, id)
                ? minimized_windows[id]
                : false;
            if (nextMinimized[id] !== minimizedValue) {
                nextMinimized[id] = minimizedValue;
                changed = true;
            }
            const snapValue = Object.prototype.hasOwnProperty.call(window_snap_states, id)
                ? window_snap_states[id]
                : null;
            if (nextSnap[id] !== snapValue) {
                nextSnap[id] = snapValue;
                changed = true;
            }
        });
        removed.forEach((id) => {
            if (Object.prototype.hasOwnProperty.call(nextFocused, id) && nextFocused[id]) {
                nextFocused[id] = false;
                changed = true;
            }
            if (Object.prototype.hasOwnProperty.call(nextMinimized, id) && nextMinimized[id]) {
                nextMinimized[id] = false;
                changed = true;
            }
            if (Object.prototype.hasOwnProperty.call(nextSnap, id) && nextSnap[id] !== null) {
                nextSnap[id] = null;
                changed = true;
            }
        });
        const orderChanged = !this.arraysEqual(currentState.window_z_order || [], snapshot.window_z_order || []);
        if (!changed && !orderChanged) {
            return null;
        }
        const partial = { window_z_order: Array.isArray(snapshot.window_z_order) ? [...snapshot.window_z_order] : [] };
        if (changed) {
            partial.focused_windows = nextFocused;
            partial.minimized_windows = nextMinimized;
            partial.window_snap_states = nextSnap;
        }
        return partial;
    };

    applyWindowManagerState = (snapshot, options = {}) => {
        const partial = this.buildWindowManagerPartial(this.state, snapshot);
        if (partial) {
            this.setWorkspaceState(partial, options.onComplete);
        } else if (typeof options.onComplete === 'function') {
            options.onComplete();
        }
    };

    loadDesktopIconPositions = () => {
        if (!safeLocalStorage) return {};
        try {
            const stored = safeLocalStorage.getItem('desktop_icon_positions');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    };

    persistIconPositions = () => {
        if (!safeLocalStorage) return;
        const positions = this.state.desktop_icon_positions || {};
        try {
            safeLocalStorage.setItem('desktop_icon_positions', JSON.stringify(positions));
            this.savedIconPositions = { ...positions };
        } catch (e) {
            // ignore write errors (storage may be unavailable)
        }
    };

    ensureIconPositions = (desktopApps = []) => {
        if (!Array.isArray(desktopApps)) return;
        this.setState((prevState) => {
            const existing = { ...(prevState.desktop_icon_positions || {}) };
            const validIds = new Set(desktopApps);
            let changed = false;

            Object.keys(existing).forEach((id) => {
                if (!validIds.has(id)) {
                    delete existing[id];
                    changed = true;
                }
            });

            desktopApps.forEach((id, index) => {
                if (!existing[id]) {
                    const stored = this.savedIconPositions[id];
                    existing[id] = stored || this.computeGridPosition(index);
                    changed = true;
                }
            });

            if (!changed) return null;
            return { desktop_icon_positions: existing };
        }, () => {
            this.persistIconPositions();
        });
    };

    getDesktopRect = () => {
        if (this.desktopRef && this.desktopRef.current) {
            return this.desktopRef.current.getBoundingClientRect();
        }
        return null;
    };

    getDesktopBounds = () => {
        const rect = this.getDesktopRect();
        if (rect) {
            return { width: rect.width, height: rect.height };
        }
        if (typeof window !== 'undefined') {
            return { width: window.innerWidth, height: window.innerHeight };
        }
        return { width: 1280, height: 720 };
    };

    computeGridMetrics = () => {
        const { width, height } = this.getDesktopBounds();
        const usableHeight = Math.max(
            this.iconDimensions.height,
            height - (this.desktopPadding.top + this.desktopPadding.bottom)
        );
        const iconsPerColumn = Math.max(1, Math.floor(usableHeight / this.iconGridSpacing.row));
        return {
            iconsPerColumn,
            offsetX: this.desktopPadding.left,
            offsetY: this.desktopPadding.top,
            columnSpacing: this.iconGridSpacing.column,
            rowSpacing: this.iconGridSpacing.row,
        };
    };

    computeGridPosition = (index = 0) => {
        const { iconsPerColumn, offsetX, offsetY, columnSpacing, rowSpacing } = this.computeGridMetrics();
        const column = Math.floor(index / iconsPerColumn);
        const row = index % iconsPerColumn;
        const x = offsetX + column * columnSpacing;
        const y = offsetY + row * rowSpacing;
        return this.clampIconPosition(x, y);
    };

    clampIconPosition = (x, y) => {
        const { width, height } = this.getDesktopBounds();
        const minX = this.desktopPadding.left;
        const maxX = Math.max(minX, width - this.iconDimensions.width - this.desktopPadding.right);
        const minY = this.desktopPadding.top;
        const maxY = Math.max(minY, height - this.iconDimensions.height - this.desktopPadding.bottom);
        const clampedX = Math.min(Math.max(x, minX), maxX);
        const clampedY = Math.min(Math.max(y, minY), maxY);
        return { x: Math.round(clampedX), y: Math.round(clampedY) };
    };

    calculateIconPosition = (clientX, clientY, dragState = this.iconDragState) => {
        if (!dragState) return { x: 0, y: 0 };
        const rect = this.getDesktopRect();
        if (!rect) {
            return this.clampIconPosition(clientX - dragState.offsetX, clientY - dragState.offsetY);
        }
        const x = clientX - rect.left - dragState.offsetX;
        const y = clientY - rect.top - dragState.offsetY;
        return this.clampIconPosition(x, y);
    };

    updateIconPosition = (id, x, y, persist = false) => {
        this.setState((prevState) => {
            const current = prevState.desktop_icon_positions || {};
            const nextPosition = this.clampIconPosition(x, y);
            const previous = current[id];
            if (previous && previous.x === nextPosition.x && previous.y === nextPosition.y && !persist) {
                return null;
            }
            return {
                desktop_icon_positions: { ...current, [id]: nextPosition },
                draggingIconId: persist ? null : prevState.draggingIconId,
            };
        }, () => {
            if (persist) {
                this.persistIconPositions();
            }
        });
    };

    handleIconPointerDown = (event, appId) => {
        if (event.button !== 0) return;
        const container = event.currentTarget;
        const rect = container.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        container.setPointerCapture?.(event.pointerId);
        this.preventNextIconClick = false;
        this.iconDragState = {
            id: appId,
            pointerId: event.pointerId,
            offsetX,
            offsetY,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            container,
        };
        this.setState({ draggingIconId: appId });
    };

    handleIconPointerMove = (event) => {
        if (!this.iconDragState || event.pointerId !== this.iconDragState.pointerId) return;
        const dragState = this.iconDragState;
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        if (!dragState.moved) {
            const threshold = 4;
            if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
                return;
            }
            dragState.moved = true;
        }
        event.preventDefault();
        const position = this.calculateIconPosition(event.clientX, event.clientY, dragState);
        this.updateIconPosition(dragState.id, position.x, position.y, false);
    };

    handleIconPointerUp = (event) => {
        if (!this.iconDragState || event.pointerId !== this.iconDragState.pointerId) return;
        this.iconDragState.container?.releasePointerCapture?.(event.pointerId);
        const dragState = this.iconDragState;
        const moved = dragState.moved;
        this.iconDragState = null;
        if (moved) {
            event.preventDefault();
            event.stopPropagation();
            const position = this.calculateIconPosition(event.clientX, event.clientY, dragState);
            this.preventNextIconClick = true;
            this.updateIconPosition(dragState.id, position.x, position.y, true);
        } else {
            this.setState({ draggingIconId: null });
        }
    };

    handleIconClickCapture = (event) => {
        if (this.preventNextIconClick) {
            event.stopPropagation();
            event.preventDefault();
            this.preventNextIconClick = false;
        }
    };

    realignIconPositions = () => {
        this.setState((prevState) => {
            const current = prevState.desktop_icon_positions || {};
            let changed = false;
            const next = {};
            Object.entries(current).forEach(([id, pos]) => {
                if (!pos) return;
                const clamped = this.clampIconPosition(pos.x, pos.y);
                if (!pos || pos.x !== clamped.x || pos.y !== clamped.y) {
                    changed = true;
                }
                next[id] = clamped;
            });
            if (!changed) return null;
            return { desktop_icon_positions: next };
        }, () => {
            this.persistIconPositions();
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
            minimized_windows: { ...snapshot.minimized_windows },
            window_positions: { ...snapshot.window_positions },
            showWindowSwitcher: false,
            switcherWindows: [],
        }, () => {
            this.broadcastWorkspaceState();
            const managerSnapshot = this.windowManager.getSnapshotForWorkspace(workspaceId);
            this.applyWindowManagerState(managerSnapshot);
        });
    };

    shiftWorkspace = (direction) => {
        const { activeWorkspace, workspaces } = this.state;
        const count = workspaces.length;
        const next = (activeWorkspace + direction + count) % count;
        this.switchWorkspace(next);
    };

    getActiveStack = () => {
        const { activeWorkspace } = this.state;
        return this.windowManager.getOrder(activeWorkspace);
    };

    handleExternalWorkspaceSelect = (event) => {
        const workspaceId = event?.detail?.workspaceId;
        if (typeof workspaceId === 'number') {
            this.switchWorkspace(workspaceId);
        }
    };

    broadcastWorkspaceState = () => {
        if (typeof window === 'undefined') return;
        const detail = {
            workspaces: this.getWorkspaceSummaries(),
            activeWorkspace: this.state.activeWorkspace,
        };
        window.dispatchEvent(new CustomEvent('workspace-state', { detail }));
    };

    componentDidMount() {
        // google analytics
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        if (typeof window !== 'undefined') {
            window.addEventListener('workspace-select', this.handleExternalWorkspaceSelect);
            window.addEventListener('workspace-request', this.broadcastWorkspaceState);
            this.broadcastWorkspaceState();
        }

        this.savedIconPositions = this.loadDesktopIconPositions();
        this.fetchAppsData(() => {
            const session = this.props.session || {};
            const positions = {};
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
        window.addEventListener('resize', this.realignIconPositions);
        document.addEventListener('keydown', this.handleGlobalShortcut);
        window.addEventListener('open-app', this.handleOpenAppEvent);
        window.addEventListener('window-snap-state', this.handleWindowSnapEvent);
    }

    componentDidUpdate(_prevProps, prevState) {
        if (
            prevState.activeWorkspace !== this.state.activeWorkspace ||
            prevState.closed_windows !== this.state.closed_windows ||
            prevState.workspaces !== this.state.workspaces
        ) {
            this.broadcastWorkspaceState();
        }
    }

    componentWillUnmount() {
        this.removeContextListeners();
        document.removeEventListener('keydown', this.handleGlobalShortcut);
        window.removeEventListener('trash-change', this.updateTrashIcon);
        window.removeEventListener('open-app', this.handleOpenAppEvent);
        window.removeEventListener('resize', this.realignIconPositions);
        window.removeEventListener('window-snap-state', this.handleWindowSnapEvent);
        if (typeof window !== 'undefined') {
            window.removeEventListener('workspace-select', this.handleExternalWorkspaceSelect);
            window.removeEventListener('workspace-request', this.broadcastWorkspaceState);
        }
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
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            if (!this.state.showWindowSwitcher) {
                this.openWindowSwitcher();
            } else {
                this.cycleApps(e.shiftKey ? -1 : 1);
            }
        } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            this.openApp('clipboard-manager');
        } else if (e.altKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            this.cycleAppWindows(e.shiftKey ? -1 : 1);
        } else if (e.altKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            this.handleSnapShortcut(e.key);
        } else if (e.metaKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            this.handleSnapShortcut(e.key);
        }
    }

    getFocusedWindowId = () => {
        return this.windowManager.getFocusedWindow(this.state.activeWorkspace);
    }

    cycleApps = (direction) => {
        const result = this.windowManager.cycleFocus(this.state.activeWorkspace, direction);
        if (result && result.snapshot) {
            this.applyWindowManagerState(result.snapshot);
        }
    }

    cycleAppWindows = (direction) => {
        const currentId = this.getFocusedWindowId();
        if (!currentId) return;
        const base = currentId.split('#')[0];
        const result = this.windowManager.cycleWithinApp(this.state.activeWorkspace, base, direction);
        if (result && result.snapshot) {
            this.applyWindowManagerState(result.snapshot);
        }
    }

    handleSnapShortcut = (key) => {
        const id = this.getFocusedWindowId();
        if (!id) return;
        const event = new CustomEvent('super-arrow', { detail: key });
        document.getElementById(id)?.dispatchEvent(event);
        let snapState;
        if (key === 'ArrowLeft') {
            snapState = 'left';
        } else if (key === 'ArrowRight') {
            snapState = 'right';
        } else if (key === 'ArrowUp') {
            snapState = 'top';
        } else if (key === 'ArrowDown') {
            snapState = null;
        } else {
            snapState = undefined;
        }
        if (snapState !== undefined) {
            const snapshot = this.windowManager.setSnapState(this.state.activeWorkspace, id, snapState);
            this.applyWindowManagerState(snapshot);
        }
    }

    handleWindowSnapEvent = (event) => {
        const detail = event?.detail;
        if (!detail || !detail.id) return;
        const snapshot = this.windowManager.setSnapState(this.state.activeWorkspace, detail.id, detail.snap ?? null);
        this.applyWindowManagerState(snapshot);
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

        const focused_windows = {};
        const closed_windows = {};
        const disabled_apps = {};
        const favourite_apps = {};
        const minimized_windows = {};
        const desktop_apps = [];

        apps.forEach((app) => {
            focused_windows[app.id] = false;
            closed_windows[app.id] = true;
            disabled_apps[app.id] = app.disabled;
            favourite_apps[app.id] = app.favourite;
            minimized_windows[app.id] = false;
            if (app.desktop_shortcut) desktop_apps.push(app.id);
        });

        const workspaceState = {
            focused_windows,
            closed_windows,
            minimized_windows,
            window_positions: this.state.window_positions || {},
            window_z_order: [],
            window_snap_states: {},
        };
        this.updateWorkspaceSnapshots(workspaceState);
        this.windowManager.reset(this.workspaceCount);
        this.setWorkspaceState({
            ...workspaceState,
            disabled_apps,
            favourite_apps,
            desktop_apps,
        }, () => {
            this.ensureIconPositions(desktop_apps);
            if (typeof callback === 'function') callback();
        });
        this.initFavourite = { ...favourite_apps };
    }

    updateAppsData = () => {
        const focused_windows = {};
        const closed_windows = {};
        const favourite_apps = {};
        const minimized_windows = {};
        const disabled_apps = {};
        const desktop_apps = [];

        apps.forEach((app) => {
            focused_windows[app.id] = this.state.focused_windows[app.id] ?? false;
            minimized_windows[app.id] = this.state.minimized_windows[app.id] ?? false;
            disabled_apps[app.id] = app.disabled;
            closed_windows[app.id] = this.state.closed_windows[app.id] ?? true;
            favourite_apps[app.id] = app.favourite;
            if (app.desktop_shortcut) desktop_apps.push(app.id);
        });

        const workspaceState = {
            focused_windows,
            closed_windows,
            minimized_windows,
            window_positions: this.state.window_positions || {},
            window_z_order: this.state.window_z_order || [],
            window_snap_states: this.state.window_snap_states || {},
        };
        this.updateWorkspaceSnapshots(workspaceState);
        this.setWorkspaceState({
            ...workspaceState,
            disabled_apps,
            favourite_apps,
            desktop_apps,
        }, () => {
            this.ensureIconPositions(desktop_apps);
        });
        this.initFavourite = { ...favourite_apps };
    }

    renderDesktopApps = () => {
        if (!this.state.desktop_apps || this.state.desktop_apps.length === 0) return null;
        const positions = this.state.desktop_icon_positions || {};
        return this.state.desktop_apps.map((appId, index) => {
            const app = apps.find((item) => item.id === appId);
            if (!app) return null;

            const props = {
                name: app.title,
                id: app.id,
                icon: app.icon,
                openApp: this.openApp,
                disabled: this.state.disabled_apps[app.id],
                prefetch: app.screen?.prefetch,
            };

            const position = positions[appId] || this.computeGridPosition(index);
            const isDragging = this.state.draggingIconId === appId;
            const wrapperStyle = {
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none',
                cursor: isDragging ? 'grabbing' : 'pointer',
                zIndex: isDragging ? 40 : 20,
            };

            return (
                <div
                    key={app.id}
                    style={wrapperStyle}
                    onPointerDown={(event) => this.handleIconPointerDown(event, app.id)}
                    onPointerMove={this.handleIconPointerMove}
                    onPointerUp={this.handleIconPointerUp}
                    onPointerCancel={this.handleIconPointerUp}
                    onClickCapture={this.handleIconClickCapture}
                >
                    <UbuntuApp {...props} draggable={false} isBeingDragged={isDragging} />
                </div>
            );
        });
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
        const nextSession = { ...this.props.session, windows };
        if ('dock' in nextSession) {
            delete nextSession.dock;
        }
        this.props.setSession(nextSession);
    }

    hasMinimised = (objId) => {
        const snapshot = this.windowManager.minimizeWindow(this.state.activeWorkspace, objId);
        this.applyWindowManagerState(snapshot, { onComplete: this.saveSession });
    }

    giveFocusToLastApp = () => {
        const snapshot = this.windowManager.focusNext(this.state.activeWorkspace);
        this.applyWindowManagerState(snapshot);
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

        const restoreDomTransform = () => {
            if (!this.state.minimized_windows[objId]) return;
            const node = document.querySelector(`#${objId}`);
            if (!node) return;
            const translateX = node.style.getPropertyValue("--window-transform-x");
            const translateY = node.style.getPropertyValue("--window-transform-y");
            node.style.transform = `translate(${translateX},${translateY}) scale(1)`;
        };

        // if app is already open, focus it instead of spawning a new window
        if (this.state.closed_windows[objId] === false) {
            const reopen = () => {
                let snapshot;
                if (this.state.minimized_windows[objId]) {
                    restoreDomTransform();
                    snapshot = this.windowManager.restoreWindow(this.state.activeWorkspace, objId);
                } else {
                    snapshot = this.windowManager.focusWindow(this.state.activeWorkspace, objId);
                }
                this.applyWindowManagerState(snapshot, { onComplete: this.saveSession });
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
                        const snapshot = this.windowManager.openWindow(this.state.activeWorkspace, objId);
                        this.applyWindowManagerState(snapshot, { onComplete: this.saveSession });
                    });
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

        const snapshot = this.windowManager.closeWindow(this.state.activeWorkspace, objId);
        this.applyWindowManagerState(snapshot);

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
        const snapshot = this.windowManager.focusWindow(this.state.activeWorkspace, objId);
        this.applyWindowManagerState(snapshot);
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
                    <input
                        className="outline-none mt-5 px-1 w-10/12  context-menu-bg border-2 border-blue-700 rounded py-0.5"
                        id="folder-name-input"
                        type="text"
                        autoComplete="off"
                        spellCheck="false"
                        autoFocus={true}
                        aria-label="Folder name"
                    />
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
        return (
            <main
                id="desktop"
                role="main"
                ref={this.desktopRef}
                className={" h-full w-full flex flex-col items-end justify-start content-start flex-wrap-reverse pt-8 bg-transparent relative overflow-hidden overscroll-none window-parent"}
            >

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

                {/* Taskbar */}
                <Taskbar
                    apps={apps}
                    closed_windows={this.state.closed_windows}
                    minimized_windows={this.state.minimized_windows}
                    focused_windows={this.state.focused_windows}
                    openApp={this.openApp}
                    minimize={this.hasMinimised}
                />

                {/* Desktop Apps */}
                {this.renderDesktopApps()}

                {/* Context Menus */}
                <DesktopMenu
                    active={this.state.context_menus.desktop}
                    openApp={this.openApp}
                    addNewFolder={this.addNewFolder}
                    openShortcutSelector={this.openShortcutSelector}
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
