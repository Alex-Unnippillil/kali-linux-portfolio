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
import { useSnapSetting } from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';

export class Desktop extends Component {
    constructor() {
        super();
        this.workspaceCount = 3;
        this.workspaceStacks = Array.from({ length: this.workspaceCount }, () => []);
        this.app_stack = this.workspaceStacks[0];
        this.initFavourite = {};
        this.allWindowClosed = false;
        this.gestureCleanup = null;
        this.pointerState = null;
        this.lastWorkspaceGesture = 0;
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
            currentWorkspace: 0,
            windowWorkspaces: {},
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
        }
    }

    componentDidMount() {
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
                this.setState({ window_positions: positions }, () => {
                    const workspaceGroups = {};
                    session.windows.forEach(({ id, workspace = 0 }) => {
                        const index = Math.min(Math.max(workspace, 0), this.workspaceCount - 1);
                        if (!workspaceGroups[index]) workspaceGroups[index] = [];
                        workspaceGroups[index].push(id);
                    });
                    const entries = Object.entries(workspaceGroups).sort((a, b) => Number(a[0]) - Number(b[0]));
                    const openNext = (idx = 0) => {
                        if (idx >= entries.length) {
                            this.switchWorkspaceTo(0);
                            return;
                        }
                        const [workspaceKey, ids] = entries[idx];
                        const workspaceIndex = Number(workspaceKey);
                        this.switchWorkspaceTo(workspaceIndex, () => {
                            ids.forEach(windowId => this.openApp(windowId, { workspace: workspaceIndex }));
                            openNext(idx + 1);
                        });
                    };
                    if (entries.length) {
                        openNext();
                    } else {
                        this.openApp('about-alex');
                    }
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
        this.setupGestures();
    }

    componentWillUnmount() {
        this.removeContextListeners();
        document.removeEventListener('keydown', this.handleGlobalShortcut);
        window.removeEventListener('trash-change', this.updateTrashIcon);
        window.removeEventListener('open-app', this.handleOpenAppEvent);
        this.teardownGestures();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.gesturesEnabled !== this.props.gesturesEnabled) {
            this.setupGestures();
        }
        if (prevState.currentWorkspace !== this.state.currentWorkspace) {
            this.app_stack = this.getWorkspaceStack();
        }
    }

    getWorkspaceStack = (index = this.state.currentWorkspace) => {
        return this.workspaceStacks[index] || [];
    }

    addToWorkspaceStack = (id, workspace) => {
        const target = Math.min(Math.max(workspace, 0), this.workspaceCount - 1);
        const stack = this.workspaceStacks[target];
        if (!stack.includes(id)) {
            stack.push(id);
        }
    }

    removeFromWorkspaceStack = (id) => {
        this.workspaceStacks.forEach(stack => {
            const idx = stack.indexOf(id);
            if (idx !== -1) {
                stack.splice(idx, 1);
            }
        });
    }

    switchWorkspace = (direction) => {
        const next = (this.state.currentWorkspace + direction + this.workspaceCount) % this.workspaceCount;
        this.switchWorkspaceTo(next);
    }

    switchWorkspaceTo = (target, callback) => {
        const clamped = Math.min(Math.max(target, 0), this.workspaceCount - 1);
        if (clamped === this.state.currentWorkspace) {
            if (typeof callback === 'function') callback();
            return;
        }
        this.app_stack = this.getWorkspaceStack(clamped);
        this.setState({ currentWorkspace: clamped }, () => {
            this.giveFocusToLastApp();
            if (typeof callback === 'function') callback();
        });
    }

    handleWorkspaceGesture = (direction, options = {}) => {
        const { force = false } = options;
        const now = Date.now();
        if (!force && now - this.lastWorkspaceGesture < 400) return;
        this.lastWorkspaceGesture = now;
        this.switchWorkspace(direction);
    }

    emitPinch = (scale) => {
        if (!scale || Number.isNaN(scale)) return;
        const windowId = this.getFocusedWindowId();
        if (!windowId) return;
        const target = document.getElementById(windowId);
        if (!target) return;
        const event = new CustomEvent('desktop-pinch', {
            detail: { windowId, scale },
            bubbles: true,
        });
        target.dispatchEvent(event);
    }

    computePointerAverage = (pointers) => {
        let totalX = 0;
        let totalY = 0;
        let count = 0;
        pointers.forEach(({ x, y }) => {
            totalX += x;
            totalY += y;
            count += 1;
        });
        if (count === 0) return { x: 0, y: 0 };
        return { x: totalX / count, y: totalY / count };
    }

    computePinchDistance = (pointers) => {
        const values = Array.from(pointers.values());
        if (values.length < 2) return 0;
        const [a, b] = values;
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    setupGestures = () => {
        this.teardownGestures();
        if (!this.props.gesturesEnabled || typeof window === 'undefined') {
            return;
        }

        const pointerState = {
            pointers: new Map(),
            swipe: null,
            pinchDistance: null,
        };
        this.pointerState = pointerState;

        const handlePointerDown = (event) => {
            if (event.pointerType !== 'touch') return;
            pointerState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointerState.pointers.size === 2) {
                pointerState.pinchDistance = this.computePinchDistance(pointerState.pointers);
            } else if (pointerState.pointers.size === 3) {
                pointerState.swipe = {
                    start: this.computePointerAverage(pointerState.pointers),
                    handled: false,
                };
            }
        };

        const handlePointerMove = (event) => {
            if (event.pointerType !== 'touch') return;
            if (!pointerState.pointers.has(event.pointerId)) return;
            pointerState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

            if (pointerState.pointers.size === 2 && pointerState.pinchDistance) {
                const distance = this.computePinchDistance(pointerState.pointers);
                if (distance > 0) {
                    const scale = distance / pointerState.pinchDistance;
                    if (Math.abs(scale - 1) > 0.05) {
                        this.emitPinch(scale);
                        pointerState.pinchDistance = distance;
                    }
                }
            } else if (pointerState.pointers.size >= 3 && pointerState.swipe) {
                if (pointerState.swipe.handled) return;
                const avg = this.computePointerAverage(pointerState.pointers);
                const deltaX = avg.x - pointerState.swipe.start.x;
                const deltaY = avg.y - pointerState.swipe.start.y;
                if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                    this.handleWorkspaceGesture(deltaX > 0 ? -1 : 1);
                    pointerState.swipe.handled = true;
                }
            }
        };

        const handlePointerUp = (event) => {
            if (event.pointerType !== 'touch') return;
            pointerState.pointers.delete(event.pointerId);
            if (pointerState.pointers.size < 2) {
                pointerState.pinchDistance = null;
            }
            if (!pointerState.swipe || pointerState.pointers.size < 3) {
                pointerState.swipe = null;
            }
        };

        const handleWheel = (event) => {
            if (!this.props.gesturesEnabled) return;
            if (event.ctrlKey) {
                const scale = Math.exp(-event.deltaY * 0.002);
                if (Math.abs(scale - 1) > 0.02) {
                    this.emitPinch(scale);
                }
                return;
            }
            if (Math.abs(event.deltaX) > 40 && Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.5) {
                const direction = event.deltaX > 0 ? 1 : -1;
                this.handleWorkspaceGesture(direction);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown, { passive: true });
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerup', handlePointerUp, { passive: true });
        window.addEventListener('pointercancel', handlePointerUp, { passive: true });
        window.addEventListener('wheel', handleWheel, { passive: true });

        this.gestureCleanup = () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
            window.removeEventListener('wheel', handleWheel);
            this.pointerState = null;
        };
    }

    teardownGestures = () => {
        if (typeof this.gestureCleanup === 'function') {
            this.gestureCleanup();
        }
        this.gestureCleanup = null;
        this.pointerState = null;
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
        if (e.ctrlKey && e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            this.handleWorkspaceGesture(e.key === 'ArrowRight' ? 1 : -1, { force: true });
        } else if (e.altKey && e.key === 'Tab') {
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
        const stack = this.getWorkspaceStack();
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
        const stack = this.getWorkspaceStack();
        const windows = stack.filter(id => id.startsWith(base));
        if (windows.length <= 1) return;
        let index = windows.indexOf(currentId);
        let next = (index + direction + windows.length) % windows.length;
        this.focus(windows[next]);
    }

    openWindowSwitcher = () => {
        const stack = this.getWorkspaceStack();
        const windows = stack
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
        this.setState({
            focused_windows,
            closed_windows,
            disabled_apps,
            favourite_apps,
            overlapped_windows,
            minimized_windows,
            desktop_apps
        }, () => {
            if (typeof callback === 'function') callback();
        });
        this.initFavourite = { ...favourite_apps };
    }

    updateAppsData = () => {
        let focused_windows = {}, closed_windows = {}, favourite_apps = {}, minimized_windows = {}, disabled_apps = {};
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
            favourite_apps = {
                ...favourite_apps,
                [app.id]: app.favourite
            }
            if (app.desktop_shortcut) desktop_apps.push(app.id);
        });
        this.setState({
            focused_windows,
            closed_windows,
            disabled_apps,
            minimized_windows,
            favourite_apps,
            desktop_apps
        });
        this.initFavourite = { ...favourite_apps };
    }

    renderDesktopApps = () => {
        if (Object.keys(this.state.closed_windows).length === 0) return;
        let appsJsx = [];
        apps.forEach((app, index) => {
            if (this.state.desktop_apps.includes(app.id)) {

                const props = {
                    name: app.title,
                    id: app.id,
                    icon: app.icon,
                    openApp: this.openApp,
                    disabled: this.state.disabled_apps[app.id],
                    prefetch: app.screen?.prefetch,
                }

                appsJsx.push(
                    <UbuntuApp key={app.id} {...props} />
                );
            }
        });
        return appsJsx;
    }

    renderWindows = () => {
        let windowsJsx = [];
        apps.forEach((app) => {
            if (this.state.closed_windows[app.id] === false) {
                const workspace = this.state.windowWorkspaces[app.id] ?? 0;
                const isActiveWorkspace = workspace === this.state.currentWorkspace;

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
                }

                windowsJsx.push(
                    <div
                        key={app.id}
                        style={{ display: isActiveWorkspace ? undefined : 'none' }}
                        aria-hidden={isActiveWorkspace ? undefined : true}
                        data-workspace={workspace}
                    >
                        <Window {...props} />
                    </div>
                )
            }
        });
        return windowsJsx;
    }

    updateWindowPosition = (id, x, y) => {
        const snap = this.props.snapEnabled
            ? (v) => Math.round(v / 8) * 8
            : (v) => v;
        this.setState(prev => ({
            window_positions: { ...prev.window_positions, [id]: { x: snap(x), y: snap(y) } }
        }), this.saveSession);
    }

    saveSession = () => {
        if (!this.props.setSession) return;
        const openWindows = Object.keys(this.state.closed_windows).filter(id => this.state.closed_windows[id] === false);
        const windows = openWindows.map(id => ({
            id,
            x: this.state.window_positions[id] ? this.state.window_positions[id].x : 60,
            y: this.state.window_positions[id] ? this.state.window_positions[id].y : 10,
            workspace: this.state.windowWorkspaces[id] ?? 0,
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
        this.setState({ hideSideBar: hide, overlapped_windows });
    }

    hasMinimised = (objId) => {
        let minimized_windows = this.state.minimized_windows;
        var focused_windows = this.state.focused_windows;

        // remove focus and minimise this window
        minimized_windows[objId] = true;
        focused_windows[objId] = false;
        this.setState({ minimized_windows, focused_windows });

        this.hideSideBar(null, false);

        this.giveFocusToLastApp();
    }

    giveFocusToLastApp = () => {
        // if there is atleast one app opened, give it focus
        if (!this.checkAllMinimised()) {
            const stack = this.getWorkspaceStack();
            for (const id of stack) {
                if (!this.state.minimized_windows[id]) {
                    this.focus(id);
                    break;
                }
            }
        }
    }

    checkAllMinimised = () => {
        let result = true;
        for (const key in this.state.minimized_windows) {
            const workspace = this.state.windowWorkspaces[key] ?? 0;
            if (workspace !== this.state.currentWorkspace) continue;
            if (!this.state.closed_windows[key]) { // if app is opened in current workspace
                result = result && this.state.minimized_windows[key];
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
        const { id, workspace } = detail;
        if (id) {
            this.openApp(id, { workspace });
        }
    }

    openApp = (objId, options = {}) => {

        const targetWorkspace = options.workspace !== undefined
            ? Math.min(Math.max(options.workspace, 0), this.workspaceCount - 1)
            : this.state.currentWorkspace;

        // google analytics
        ReactGA.event({
            category: `Open App`,
            action: `Opened ${objId} window`
        });

        // if the app is disabled
        if (this.state.disabled_apps[objId]) return;

        // if app is already open, focus it instead of spawning a new window
        if (this.state.closed_windows[objId] === false) {
            const existingWorkspace = this.state.windowWorkspaces[objId] ?? 0;
            if (existingWorkspace !== this.state.currentWorkspace) {
                this.switchWorkspaceTo(existingWorkspace, () => {
                    this.openApp(objId, { workspace: existingWorkspace });
                });
                return;
            }
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

            let recentApps = [];
            try { recentApps = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]'); } catch (e) { recentApps = []; }
            recentApps = recentApps.filter(id => id !== objId);
            recentApps.unshift(objId);
            recentApps = recentApps.slice(0, 10);
            safeLocalStorage?.setItem('recentApps', JSON.stringify(recentApps));

            const shouldFocusCurrent = targetWorkspace === this.state.currentWorkspace;

            setTimeout(() => {
                favourite_apps[objId] = true; // adds opened app to sideBar
                closed_windows[objId] = false; // openes app's window
                const windowWorkspaces = { ...this.state.windowWorkspaces, [objId]: targetWorkspace };
                this.addToWorkspaceStack(objId, targetWorkspace);
                this.setState({ closed_windows, favourite_apps, allAppsView: false, windowWorkspaces }, () => {
                    if (shouldFocusCurrent) {
                        this.focus(objId);
                    }
                    this.saveSession();
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
        this.removeFromWorkspaceStack(objId);

        this.giveFocusToLastApp();

        this.hideSideBar(null, false);

        // close window
        let closed_windows = this.state.closed_windows;
        let favourite_apps = this.state.favourite_apps;
        const windowWorkspaces = { ...this.state.windowWorkspaces };
        delete windowWorkspaces[objId];

        if (this.initFavourite[objId] === false) favourite_apps[objId] = false; // if user default app is not favourite, remove from sidebar
        closed_windows[objId] = true; // closes the app's window

        this.setState({ closed_windows, favourite_apps, windowWorkspaces }, this.saveSession);
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
        this.setState({ focused_windows });
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
    }

    showAllApps = () => { this.setState({ allAppsView: !this.state.allAppsView }) }

    renderNameBar = () => {
        let addFolder = () => {
            let folder_name = document.getElementById("folder-name-input").value;
            this.addToDesktop(folder_name);
        }

        let removeCard = () => {
            this.setState({ showNameBar: false });
        }

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
    }

    render() {
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
                        recentApps={this.getWorkspaceStack()}
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
        )
    }
}

export default function DesktopWithSnap(props) {
    const [snapEnabled] = useSnapSetting();
    const { touchpadGestures } = useSettings();
    return <Desktop {...props} snapEnabled={snapEnabled} gesturesEnabled={touchpadGestures} />;
}
