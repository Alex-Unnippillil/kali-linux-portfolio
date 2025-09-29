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

export class Desktop extends Component {
    constructor() {
        super();
        this.workspaceCount = 4;
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
        this.workspaceSnapshots = Array.from({ length: this.workspaceCount }, () => this.createEmptyWorkspaceState());
        this.workspaceKeys = new Set([
            'focused_windows',
            'closed_windows',
            'minimized_windows',
            'window_positions',
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
        this.iconKeyListenerAttached = false;

    }

    createEmptyWorkspaceState = () => ({
        focused_windows: {},
        closed_windows: {},
        minimized_windows: {},
        window_positions: {},
    });

    cloneWorkspaceState = (state) => ({
        focused_windows: { ...state.focused_windows },
        closed_windows: { ...state.closed_windows },
        minimized_windows: { ...state.minimized_windows },
        window_positions: { ...state.window_positions },
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

    setupPointerMediaWatcher = () => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            this.configureTouchTargets(false);
            return;
        }
        const query = window.matchMedia('(pointer: coarse)');
        this.pointerMedia = query;
        const listener = (event) => {
            this.configureTouchTargets(event.matches);
        };
        this.pointerMediaListener = listener;
        this.configureTouchTargets(query.matches);
        if (typeof query.addEventListener === 'function') {
            query.addEventListener('change', listener);
        } else if (typeof query.addListener === 'function') {
            query.addListener(listener);
        }
    };

    teardownPointerMediaWatcher = () => {
        if (!this.pointerMedia) return;
        const listener = this.pointerMediaListener;
        if (listener) {
            if (typeof this.pointerMedia.removeEventListener === 'function') {
                this.pointerMedia.removeEventListener('change', listener);
            } else if (typeof this.pointerMedia.removeListener === 'function') {
                this.pointerMedia.removeListener(listener);
            }
        }
        this.pointerMedia = null;
        this.pointerMediaListener = null;
    };

    configureTouchTargets = (isCoarse) => {
        const nextDimensions = isCoarse
            ? { width: 120, height: 108 }
            : { ...this.defaultIconDimensions };
        const nextSpacing = isCoarse
            ? { row: 144, column: 156 }
            : { ...this.defaultIconGridSpacing };
        const nextPadding = isCoarse
            ? { top: 72, right: 32, bottom: 168, left: 32 }
            : { ...this.defaultDesktopPadding };

        const changed =
            nextDimensions.width !== this.iconDimensions.width ||
            nextDimensions.height !== this.iconDimensions.height ||
            nextSpacing.row !== this.iconGridSpacing.row ||
            nextSpacing.column !== this.iconGridSpacing.column ||
            nextPadding.top !== this.desktopPadding.top ||
            nextPadding.right !== this.desktopPadding.right ||
            nextPadding.bottom !== this.desktopPadding.bottom ||
            nextPadding.left !== this.desktopPadding.left;

        if (!changed) return;

        this.iconDimensions = { ...nextDimensions };
        this.iconGridSpacing = { ...nextSpacing };
        this.desktopPadding = { ...nextPadding };
        this.realignIconPositions();
    };

    computeTouchCentroid = (touchList) => {
        if (!touchList || touchList.length === 0) return null;
        const touches = Array.from(touchList);
        const total = touches.reduce(
            (acc, touch) => {
                acc.x += touch.clientX;
                acc.y += touch.clientY;
                return acc;
            },
            { x: 0, y: 0 }
        );
        return {
            x: total.x / touches.length,
            y: total.y / touches.length,
        };
    };

    setupGestureListeners = () => {
        const node = this.desktopRef && this.desktopRef.current ? this.desktopRef.current : null;
        if (!node) return;
        if (this.gestureRoot && this.gestureRoot !== node) {
            this.teardownGestureListeners();
        }
        if (this.gestureListenersAttached) return;
        this.gestureListenersAttached = true;
        this.gestureRoot = node;
        const options = { passive: true };
        node.addEventListener('pointerdown', this.handleShellPointerDown, options);
        node.addEventListener('pointermove', this.handleShellPointerMove, options);
        node.addEventListener('pointerup', this.handleShellPointerUp, options);
        node.addEventListener('pointercancel', this.handleShellPointerCancel, options);
        node.addEventListener('touchstart', this.handleShellTouchStart, options);
        node.addEventListener('touchmove', this.handleShellTouchMove, options);
        node.addEventListener('touchend', this.handleShellTouchEnd, options);
        node.addEventListener('touchcancel', this.handleShellTouchCancel, options);
    };

    teardownGestureListeners = () => {
        const node = this.gestureRoot;
        if (!node || !this.gestureListenersAttached) return;
        this.gestureListenersAttached = false;
        node.removeEventListener('pointerdown', this.handleShellPointerDown);
        node.removeEventListener('pointermove', this.handleShellPointerMove);
        node.removeEventListener('pointerup', this.handleShellPointerUp);
        node.removeEventListener('pointercancel', this.handleShellPointerCancel);
        node.removeEventListener('touchstart', this.handleShellTouchStart);
        node.removeEventListener('touchmove', this.handleShellTouchMove);
        node.removeEventListener('touchend', this.handleShellTouchEnd);
        node.removeEventListener('touchcancel', this.handleShellTouchCancel);
        this.gestureRoot = null;
    };

    handleShellPointerDown = (event) => {
        if (event.pointerType !== 'touch' || event.isPrimary === false) return;
        const targetWindow = event.target && event.target.closest ? event.target.closest('.opened-window') : null;
        if (!targetWindow || !targetWindow.id) return;
        this.gestureState.pointer = {
            pointerId: event.pointerId,
            windowId: targetWindow.id,
            startX: event.clientX,
            startY: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
        };
    };

    handleShellPointerMove = (event) => {
        const gesture = this.gestureState.pointer;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
    };

    handleShellPointerUp = (event) => {
        const gesture = this.gestureState.pointer;
        if (!gesture || gesture.pointerId !== event.pointerId) {
            return;
        }
        this.gestureState.pointer = null;
        if (!gesture.windowId) return;
        const deltaX = gesture.lastX - gesture.startX;
        const deltaY = gesture.lastY - gesture.startY;
        const distance = Math.abs(deltaX);
        const verticalDrift = Math.abs(deltaY);
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const duration = now - gesture.startTime;
        if (distance < 120 || verticalDrift > 90 || duration > 600) {
            return;
        }
        const velocity = distance / Math.max(duration, 1);
        if (velocity < 0.35) {
            return;
        }
        const direction = deltaX > 0 ? 'ArrowRight' : 'ArrowLeft';
        const dispatched = this.dispatchWindowCommand(gesture.windowId, direction);
        if (dispatched) {
            this.focus(gesture.windowId);
        }
    };

    handleShellPointerCancel = (event) => {
        const gesture = this.gestureState.pointer;
        if (gesture && gesture.pointerId === event.pointerId) {
            this.gestureState.pointer = null;
        }
    };

    handleShellTouchStart = (event) => {
        if (event.touches && event.touches.length > 1) {
            this.gestureState.pointer = null;
        }
        if (!event.touches || event.touches.length !== 3) return;
        const centroid = this.computeTouchCentroid(event.touches);
        if (!centroid) return;
        this.gestureState.overview = {
            startY: centroid.y,
            lastY: centroid.y,
            startTime: typeof performance !== 'undefined' ? performance.now() : Date.now(),
            triggered: false,
        };
    };

    handleShellTouchMove = (event) => {
        const gesture = this.gestureState.overview;
        if (!gesture) return;
        const centroid = this.computeTouchCentroid(event.touches);
        if (!centroid) return;
        gesture.lastY = centroid.y;
    };

    handleShellTouchEnd = (event) => {
        const gesture = this.gestureState.overview;
        if (!gesture) {
            return;
        }
        if (event.touches && event.touches.length > 0) {
            return;
        }
        const deltaY = gesture.startY - (gesture.lastY ?? gesture.startY);
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const duration = now - gesture.startTime;
        const shouldTrigger = deltaY > 60 || (deltaY > 40 && duration < 400);
        if (shouldTrigger && !gesture.triggered) {
            if (!this.state.showWindowSwitcher) {
                this.openWindowSwitcher();
            }
            gesture.triggered = true;
        }
        this.gestureState.overview = null;
    };

    handleShellTouchCancel = () => {
        this.gestureState.overview = null;
    };

    dispatchWindowCommand = (windowId, key) => {
        if (!windowId) return false;
        const node = typeof document !== 'undefined' ? document.getElementById(windowId) : null;
        if (!node) return false;
        const event = new CustomEvent('super-arrow', { detail: key, bubbles: true });
        node.dispatchEvent(event);
        return true;
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
                minimized_windows: this.mergeWorkspaceMaps(existing.minimized_windows, baseState.minimized_windows, validKeys),
                window_positions: this.mergeWorkspaceMaps(existing.window_positions, baseState.window_positions, validKeys),
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
        let startPosition = null;
        const positions = this.state.desktop_icon_positions || {};
        if (positions[appId]) {
            startPosition = { ...positions[appId] };
        } else if (typeof window !== 'undefined') {
            const style = window.getComputedStyle(container);
            const left = parseFloat(style.left) || 0;
            const top = parseFloat(style.top) || 0;
            startPosition = { x: left, y: top };
        }
        this.iconDragState = {
            id: appId,
            pointerId: event.pointerId,
            offsetX,
            offsetY,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            container,
            startPosition,
            lastPosition: startPosition,
        };
        this.setState({ draggingIconId: appId });
        this.attachIconKeyboardListeners();
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
        dragState.lastPosition = position;
        this.updateIconPosition(dragState.id, position.x, position.y, false);
    };

    handleIconPointerUp = (event) => {
        if (!this.iconDragState || event.pointerId !== this.iconDragState.pointerId) return;
        const dragState = this.iconDragState;
        const moved = dragState.moved;
        this.iconDragState = null;
        dragState.container?.releasePointerCapture?.(event.pointerId);
        this.detachIconKeyboardListeners();
        if (moved) {
            event.preventDefault();
            event.stopPropagation();
            const position = this.resolveDropPosition(event, dragState);
            this.preventNextIconClick = true;
            this.updateIconPosition(dragState.id, position.x, position.y, true);
        } else {
            this.setState({ draggingIconId: null });
        }
    };

    handleIconPointerCancel = (event) => {
        if (!this.iconDragState || event.pointerId !== this.iconDragState.pointerId) return;
        event.preventDefault();
        this.cancelIconDrag(true);
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
            this.giveFocusToLastApp();
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
        if (!this.workspaceStacks[activeWorkspace]) {
            this.workspaceStacks[activeWorkspace] = [];
        }
        return this.workspaceStacks[activeWorkspace];
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
        this.setupPointerMediaWatcher();
        this.setupGestureListeners();
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
        this.detachIconKeyboardListeners();
        if (typeof window !== 'undefined') {
            window.removeEventListener('workspace-select', this.handleExternalWorkspaceSelect);
            window.removeEventListener('workspace-request', this.broadcastWorkspaceState);
        }
        this.teardownGestureListeners();
        this.teardownPointerMediaWatcher();
    }

    attachIconKeyboardListeners = () => {
        if (this.iconKeyListenerAttached || typeof document === 'undefined') return;
        document.addEventListener('keydown', this.handleIconKeyboardCancel, true);
        this.iconKeyListenerAttached = true;
    };

    detachIconKeyboardListeners = () => {
        if (!this.iconKeyListenerAttached || typeof document === 'undefined') return;
        document.removeEventListener('keydown', this.handleIconKeyboardCancel, true);
        this.iconKeyListenerAttached = false;
    };

    handleIconKeyboardCancel = (event) => {
        if (!this.iconDragState) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.cancelIconDrag(true);
        }
    };

    cancelIconDrag = (revert = false) => {
        const dragState = this.iconDragState;
        if (!dragState) return;

        dragState.container?.releasePointerCapture?.(dragState.pointerId);
        this.iconDragState = null;
        this.detachIconKeyboardListeners();

        if (revert && dragState.startPosition) {
            const original = this.clampIconPosition(dragState.startPosition.x, dragState.startPosition.y);
            this.setState((prevState) => {
                const current = prevState.desktop_icon_positions || {};
                const previous = current[dragState.id];
                if (previous && previous.x === original.x && previous.y === original.y && prevState.draggingIconId === null) {
                    return { draggingIconId: null };
                }
                return {
                    desktop_icon_positions: { ...current, [dragState.id]: original },
                    draggingIconId: null,
                };
            });
        } else {
            this.setState({ draggingIconId: null });
        }

        this.preventNextIconClick = false;
    };

    resolveDropPosition = (event, dragState) => {
        const hasValidCoordinates = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY);
        if (hasValidCoordinates) {
            return this.calculateIconPosition(event.clientX, event.clientY, dragState);
        }
        return dragState?.lastPosition || dragState?.startPosition || { x: 0, y: 0 };
    };

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
        };
        this.updateWorkspaceSnapshots(workspaceState);
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
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
                    onPointerCancel={this.handleIconPointerCancel}
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
        let minimized_windows = this.state.minimized_windows;
        var focused_windows = this.state.focused_windows;

        // remove focus and minimise this window
        minimized_windows[objId] = true;
        focused_windows[objId] = false;
        this.setWorkspaceState({ minimized_windows, focused_windows });

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
                    const stack = this.getActiveStack();
                    if (!stack.includes(objId)) {
                        stack.push(objId);
                    }
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
