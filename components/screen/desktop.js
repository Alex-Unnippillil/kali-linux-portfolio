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
import { ensureDisplayConfig, saveDisplayConfig } from '../../utils/displayState';
import { useSnapSetting } from '../../hooks/usePersistentState';
import useSession from '../../hooks/useSession';

const createWorkspaceDefaults = () => {
    const focused_windows = {};
    const closed_windows = {};
    const overlapped_windows = {};
    const minimized_windows = {};
    apps.forEach(app => {
        focused_windows[app.id] = false;
        closed_windows[app.id] = true;
        overlapped_windows[app.id] = false;
        minimized_windows[app.id] = false;
    });
    return {
        focused_windows,
        closed_windows,
        overlapped_windows,
        minimized_windows,
        window_positions: {},
        app_stack: [],
    };
};

const normalizeWorkspaceSnapshot = (snapshot = createWorkspaceDefaults()) => {
    const base = createWorkspaceDefaults();
    const result = {
        focused_windows: { ...base.focused_windows, ...(snapshot.focused_windows || {}) },
        closed_windows: { ...base.closed_windows, ...(snapshot.closed_windows || {}) },
        overlapped_windows: { ...base.overlapped_windows, ...(snapshot.overlapped_windows || {}) },
        minimized_windows: { ...base.minimized_windows, ...(snapshot.minimized_windows || {}) },
        window_positions: {},
        app_stack: Array.isArray(snapshot.app_stack) ? [...snapshot.app_stack] : [],
    };

    Object.keys(snapshot.window_positions || {}).forEach(id => {
        if (id in base.closed_windows) {
            result.window_positions[id] = snapshot.window_positions[id];
        }
    });

    result.app_stack = result.app_stack.filter(id => id in base.closed_windows);

    return result;
};

export class Desktop extends Component {
    constructor() {
        super();
        const defaultWorkspace = createWorkspaceDefaults();
        this.app_stack = [...defaultWorkspace.app_stack];
        this.initFavourite = {};
        this.allWindowClosed = false;
        this.state = {
            focused_windows: defaultWorkspace.focused_windows,
            closed_windows: defaultWorkspace.closed_windows,
            allAppsView: false,
            overlapped_windows: defaultWorkspace.overlapped_windows,
            disabled_apps: {},
            favourite_apps: {},
            hideSideBar: false,
            minimized_windows: defaultWorkspace.minimized_windows,
            window_positions: defaultWorkspace.window_positions,
            desktop_apps: [],
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
            activeDisplayId: 'display-1',
            displayOrder: ['display-1'],
            displayMeta: { 'display-1': { name: 'Primary Display' } },
            displayWorkspaces: { 'display-1': defaultWorkspace },
        }
    }

    snapshotActiveWorkspace = (state = this.state, appStack = this.app_stack) => normalizeWorkspaceSnapshot({
        focused_windows: state.focused_windows,
        closed_windows: state.closed_windows,
        overlapped_windows: state.overlapped_windows,
        minimized_windows: state.minimized_windows,
        window_positions: state.window_positions,
        app_stack: Array.isArray(appStack) ? [...appStack] : [...this.app_stack],
    });

    updateStateAndWorkspace = (partialState, callback) => {
        this.setState(prev => {
            const merged = { ...prev, ...partialState };
            const snapshot = this.snapshotActiveWorkspace(merged);
            return {
                ...partialState,
                displayWorkspaces: {
                    ...prev.displayWorkspaces,
                    [prev.activeDisplayId]: snapshot,
                },
            };
        }, () => {
            if (typeof callback === 'function') callback();
        });
    };

    switchDisplay = (nextDisplayId) => {
        if (!nextDisplayId || nextDisplayId === this.state.activeDisplayId) return;
        this.setState(prev => {
            const currentSnapshot = this.snapshotActiveWorkspace(prev);
            const nextSnapshot = normalizeWorkspaceSnapshot(prev.displayWorkspaces[nextDisplayId] || createWorkspaceDefaults());
            return {
                activeDisplayId: nextDisplayId,
                focused_windows: nextSnapshot.focused_windows,
                closed_windows: nextSnapshot.closed_windows,
                overlapped_windows: nextSnapshot.overlapped_windows,
                minimized_windows: nextSnapshot.minimized_windows,
                window_positions: nextSnapshot.window_positions,
                displayWorkspaces: {
                    ...prev.displayWorkspaces,
                    [prev.activeDisplayId]: currentSnapshot,
                    [nextDisplayId]: nextSnapshot,
                },
            };
        }, () => {
            const workspace = this.state.displayWorkspaces[nextDisplayId] || normalizeWorkspaceSnapshot();
            this.app_stack = [...workspace.app_stack];
            this.hideSideBar(null, false);
            this.saveSession();
        });
    };

    handlePrimaryDisplayChange = (event) => {
        const detail = event?.detail;
        const nextId = typeof detail === 'string' ? detail : detail?.id;
        if (typeof nextId !== 'string') return;
        this.switchDisplay(nextId);
    };

    handleDisplaysUpdated = (event) => {
        const detail = event?.detail;
        let config = Array.isArray(detail) ? detail : ensureDisplayConfig();
        config = (config || []).filter(display => display && typeof display.id === 'string');
        if (!config.length) {
            config = [{ id: 'display-1', name: 'Primary Display' }];
        }

        const order = config.map(display => display.id);
        const meta = {};
        config.forEach((display, index) => {
            meta[display.id] = { name: display.name || `Display ${index + 1}` };
        });

        this.setState(prev => {
            const workspaces = { ...prev.displayWorkspaces };
            order.forEach(id => {
                workspaces[id] = normalizeWorkspaceSnapshot(workspaces[id] || createWorkspaceDefaults());
            });
            Object.keys(workspaces).forEach(id => {
                if (!order.includes(id)) {
                    delete workspaces[id];
                }
            });

            let activeDisplayId = prev.activeDisplayId;
            if (!order.includes(activeDisplayId)) {
                activeDisplayId = order[0];
            }

            const activeWorkspace = normalizeWorkspaceSnapshot(workspaces[activeDisplayId] || createWorkspaceDefaults());
            return {
                displayOrder: order,
                displayMeta: meta,
                activeDisplayId,
                displayWorkspaces: { ...workspaces, [activeDisplayId]: activeWorkspace },
                focused_windows: activeWorkspace.focused_windows,
                closed_windows: activeWorkspace.closed_windows,
                overlapped_windows: activeWorkspace.overlapped_windows,
                minimized_windows: activeWorkspace.minimized_windows,
                window_positions: activeWorkspace.window_positions,
            };
        }, () => {
            const workspace = this.state.displayWorkspaces[this.state.activeDisplayId];
            this.app_stack = [...(workspace?.app_stack || [])];
            this.hideSideBar(null, false);
            this.saveSession();
            saveDisplayConfig(this.state.displayOrder.map(id => ({ id, name: this.state.displayMeta[id]?.name || '' })));
        });
    };

    initializeDisplays = () => {
        const session = this.props.session || {};
        const configDisplays = ensureDisplayConfig();
        const displaysMap = new Map();

        configDisplays.forEach((display, index) => {
            if (!display || typeof display.id !== 'string') return;
            const label = display.name || `Display ${index + 1}`;
            displaysMap.set(display.id, { id: display.id, name: label });
        });

        const sessionDisplays = Array.isArray(session.displays) ? session.displays : [];
        sessionDisplays.forEach((display, index) => {
            if (!display || typeof display.id !== 'string') return;
            const label = display.name || `Display ${configDisplays.length + index + 1}`;
            displaysMap.set(display.id, { id: display.id, name: label });
        });

        if (displaysMap.size === 0) {
            displaysMap.set('display-1', { id: 'display-1', name: 'Primary Display' });
        }

        const order = Array.from(displaysMap.keys());
        const meta = {};
        const workspaces = { ...this.state.displayWorkspaces };

        const legacyWindows = !sessionDisplays.length && Array.isArray(session.windows) ? session.windows : [];

        order.forEach((id, index) => {
            const descriptor = displaysMap.get(id);
            meta[id] = { name: descriptor?.name || `Display ${index + 1}` };

            const stored = sessionDisplays.find(display => display.id === id);
            let snapshot = normalizeWorkspaceSnapshot(workspaces[id] || createWorkspaceDefaults());

            let windowsToRestore = [];
            if (stored && Array.isArray(stored.windows)) {
                windowsToRestore = stored.windows;
            } else if (!stored && index === 0 && legacyWindows.length) {
                windowsToRestore = legacyWindows;
            }

            windowsToRestore.forEach(({ id: appId, x, y, minimized }) => {
                if (!(appId in snapshot.closed_windows)) return;
                snapshot.closed_windows[appId] = false;
                snapshot.minimized_windows[appId] = !!minimized;
                snapshot.window_positions[appId] = { x, y };
                snapshot.app_stack = snapshot.app_stack.filter(existing => existing !== appId);
                snapshot.app_stack.push(appId);
            });

            if (snapshot.app_stack.length) {
                const last = snapshot.app_stack[snapshot.app_stack.length - 1];
                Object.keys(snapshot.focused_windows).forEach(key => {
                    snapshot.focused_windows[key] = key === last;
                });
            }

            workspaces[id] = normalizeWorkspaceSnapshot(snapshot);
        });

        const requestedActive = typeof session.activeDisplay === 'string' ? session.activeDisplay : null;
        const activeDisplayId = requestedActive && order.includes(requestedActive)
            ? requestedActive
            : order[0];
        const activeWorkspace = normalizeWorkspaceSnapshot(workspaces[activeDisplayId] || createWorkspaceDefaults());
        this.app_stack = [...activeWorkspace.app_stack];

        this.setState({
            activeDisplayId,
            displayOrder: order,
            displayMeta: meta,
            displayWorkspaces: { ...workspaces, [activeDisplayId]: activeWorkspace },
            focused_windows: activeWorkspace.focused_windows,
            closed_windows: activeWorkspace.closed_windows,
            overlapped_windows: activeWorkspace.overlapped_windows,
            minimized_windows: activeWorkspace.minimized_windows,
            window_positions: activeWorkspace.window_positions,
        }, () => {
            saveDisplayConfig(order.map(id => ({ id, name: meta[id]?.name || '' })));
            if (!activeWorkspace.app_stack.length) {
                this.openApp('about-alex');
            }
        });
    };

    componentDidMount() {
        // google analytics
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        this.fetchAppsData(() => {
            const session = this.props.session || {};
            if (session.dock && session.dock.length) {
                let favourite_apps = { ...this.state.favourite_apps };
                session.dock.forEach(id => {
                    favourite_apps[id] = true;
                });
                this.setState({ favourite_apps });
            }
            this.initializeDisplays();
        });
        this.setContextListeners();
        this.setEventListeners();
        this.checkForNewFolders();
        this.checkForAppShortcuts();
        this.updateTrashIcon();
        window.addEventListener('trash-change', this.updateTrashIcon);
        document.addEventListener('keydown', this.handleGlobalShortcut);
        window.addEventListener('open-app', this.handleOpenAppEvent);
        window.addEventListener('desktop:primary-display-change', this.handlePrimaryDisplayChange);
        window.addEventListener('desktop:displays-updated', this.handleDisplaysUpdated);
    }

    componentWillUnmount() {
        this.removeContextListeners();
        document.removeEventListener('keydown', this.handleGlobalShortcut);
        window.removeEventListener('trash-change', this.updateTrashIcon);
        window.removeEventListener('open-app', this.handleOpenAppEvent);
        window.removeEventListener('desktop:primary-display-change', this.handlePrimaryDisplayChange);
        window.removeEventListener('desktop:displays-updated', this.handleDisplaysUpdated);
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
        if (!this.app_stack.length) return;
        const currentId = this.getFocusedWindowId();
        let index = this.app_stack.indexOf(currentId);
        if (index === -1) index = 0;
        let next = (index + direction + this.app_stack.length) % this.app_stack.length;
        // Skip minimized windows
        for (let i = 0; i < this.app_stack.length; i++) {
            const id = this.app_stack[next];
            if (!this.state.minimized_windows[id]) {
                this.focus(id);
                break;
            }
            next = (next + direction + this.app_stack.length) % this.app_stack.length;
        }
    }

    cycleAppWindows = (direction) => {
        const currentId = this.getFocusedWindowId();
        if (!currentId) return;
        const base = currentId.split('#')[0];
        const windows = this.app_stack.filter(id => id.startsWith(base));
        if (windows.length <= 1) return;
        let index = windows.indexOf(currentId);
        let next = (index + direction + windows.length) % windows.length;
        this.focus(windows[next]);
    }

    openWindowSwitcher = () => {
        const windows = this.app_stack
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
        this.updateStateAndWorkspace({
            focused_windows,
            closed_windows,
            disabled_apps,
            favourite_apps,
            overlapped_windows,
            minimized_windows,
            desktop_apps,
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
        this.updateStateAndWorkspace({
            focused_windows,
            closed_windows,
            disabled_apps,
            minimized_windows,
            favourite_apps,
            desktop_apps,
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
        const window_positions = { ...this.state.window_positions, [id]: { x: snap(x), y: snap(y) } };
        this.updateStateAndWorkspace({ window_positions }, this.saveSession);
    }

    saveSession = () => {
        if (!this.props.setSession) return;
        const snapshots = {
            ...this.state.displayWorkspaces,
            [this.state.activeDisplayId]: this.snapshotActiveWorkspace(),
        };
        const displays = this.state.displayOrder.map(id => {
            const workspace = normalizeWorkspaceSnapshot(snapshots[id] || createWorkspaceDefaults());
            const openWindows = Object.keys(workspace.closed_windows).filter(key => workspace.closed_windows[key] === false);
            const windows = openWindows.map(key => ({
                id: key,
                x: workspace.window_positions[key] ? workspace.window_positions[key].x : 60,
                y: workspace.window_positions[key] ? workspace.window_positions[key].y : 10,
                minimized: workspace.minimized_windows[key] || false,
            }));
            return {
                id,
                name: this.state.displayMeta[id]?.name || '',
                windows,
            };
        });
        const activeDisplay = this.state.activeDisplayId;
        const activeWindows = displays.find(display => display.id === activeDisplay)?.windows || [];
        const dock = Object.keys(this.state.favourite_apps).filter(id => this.state.favourite_apps[id]);
        const sessionPayload = {
            ...this.props.session,
            windows: activeWindows,
            dock,
            displays,
            activeDisplay,
        };
        this.props.setSession(sessionPayload);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('desktop:session-updated', { detail: sessionPayload }));
        }
    }

    hideSideBar = (objId, hide) => {
        if (objId === null) {
            if (hide === false) {
                if (this.state.hideSideBar !== false) {
                    this.updateStateAndWorkspace({ hideSideBar: false });
                }
            } else {
                const hasOverlap = Object.values(this.state.overlapped_windows || {}).some(Boolean);
                if (hasOverlap && this.state.hideSideBar !== true) {
                    this.updateStateAndWorkspace({ hideSideBar: true });
                }
            }
            return;
        }

        if (hide === false) {
            for (const key in this.state.overlapped_windows) {
                if (this.state.overlapped_windows[key] && key !== objId) {
                    return; // if any window is overlapped then don't show the SideBar
                }
            }
        }

        const overlapped_windows = { ...this.state.overlapped_windows, [objId]: hide };
        if (this.state.overlapped_windows[objId] === hide && this.state.hideSideBar === hide) {
            return;
        }
        this.updateStateAndWorkspace({ hideSideBar: hide, overlapped_windows });
    }

    hasMinimised = (objId) => {
        const minimized_windows = { ...this.state.minimized_windows, [objId]: true };
        const focused_windows = { ...this.state.focused_windows, [objId]: false };

        this.updateStateAndWorkspace({ minimized_windows, focused_windows }, () => {
            this.hideSideBar(null, false);
            this.giveFocusToLastApp();
            this.saveSession();
        });
    }

    giveFocusToLastApp = () => {
        // if there is atleast one app opened, give it focus
        if (!this.checkAllMinimised()) {
            for (const index in this.app_stack) {
                if (!this.state.minimized_windows[this.app_stack[index]]) {
                    this.focus(this.app_stack[index]);
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
        const id = e.detail;
        if (id) {
            this.openApp(id);
        }
    }

    openApp = (objId) => {

        // google analytics
        ReactGA.event({
            category: `Open App`,
            action: `Opened ${objId} window`
        });

        // if the app is disabled
        if (this.state.disabled_apps[objId]) return;

        const isOpen = this.state.closed_windows[objId] === false;

        // if app is already open, focus it instead of spawning a new window
        if (isOpen) {
            if (this.state.minimized_windows[objId]) {
                const minimized_windows = { ...this.state.minimized_windows, [objId]: false };
                this.updateStateAndWorkspace({ minimized_windows }, () => {
                    this.focus(objId);
                    const node = document.querySelector(`#${objId}`);
                    if (node) {
                        const x = node.style.getPropertyValue("--window-transform-x");
                        const y = node.style.getPropertyValue("--window-transform-y");
                        node.style.transform = `translate(${x},${y}) scale(1)`;
                    }
                    this.saveSession();
                });
            } else {
                this.focus(objId);
                this.saveSession();
            }
            return;
        }

        let frequentApps = [];
        try { frequentApps = JSON.parse(safeLocalStorage?.getItem('frequentApps') || '[]'); } catch (e) { frequentApps = []; }
        const currentApp = frequentApps.find(app => app.id === objId);
        if (currentApp) {
            frequentApps = frequentApps.map(app => app.id === currentApp.id ? { ...app, frequency: app.frequency + 1 } : app);
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

        setTimeout(() => {
            const closed_windows = { ...this.state.closed_windows, [objId]: false };
            const favourite_apps = { ...this.state.favourite_apps, [objId]: true };
            const minimized_windows = { ...this.state.minimized_windows, [objId]: false };

            this.updateStateAndWorkspace({ closed_windows, favourite_apps, minimized_windows, allAppsView: false }, () => {
                this.focus(objId);
                this.saveSession();
            });
        }, 200);
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
        this.app_stack = this.app_stack.filter(id => id !== objId);

        const closed_windows = { ...this.state.closed_windows, [objId]: true };
        const favourite_apps = { ...this.state.favourite_apps };
        const minimized_windows = { ...this.state.minimized_windows, [objId]: false };
        const focused_windows = { ...this.state.focused_windows, [objId]: false };
        const overlapped_windows = { ...this.state.overlapped_windows, [objId]: false };

        if (this.initFavourite[objId] === false) {
            favourite_apps[objId] = false; // if user default app is not favourite, remove from sidebar
        }

        this.updateStateAndWorkspace({ closed_windows, favourite_apps, minimized_windows, focused_windows, overlapped_windows }, () => {
            this.hideSideBar(null, false);
            this.giveFocusToLastApp();
            this.saveSession();
        });
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
        if (this.state.closed_windows[objId]) return;

        const focused_windows = { ...this.state.focused_windows };
        Object.keys(focused_windows).forEach(key => {
            focused_windows[key] = key === objId;
        });

        this.app_stack = this.app_stack.filter(id => id !== objId);
        this.app_stack.push(objId);

        this.updateStateAndWorkspace({ focused_windows });
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
        const activeWorkspace = this.snapshotActiveWorkspace();
        const displayIndex = this.state.displayOrder.indexOf(this.state.activeDisplayId);
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
                    workspace={activeWorkspace}
                    openAppByAppId={this.openApp} />

                {/* Taskbar */}
                <Taskbar
                    apps={apps}
                    workspace={activeWorkspace}
                    openApp={this.openApp}
                    minimize={this.hasMinimised}
                    displayId={this.state.activeDisplayId}
                    displayIndex={displayIndex >= 0 ? displayIndex : 0}
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
                        recentApps={this.app_stack}
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
    const { session, setSession, resetSession } = useSession();
    return (
        <Desktop
            {...props}
            snapEnabled={snapEnabled}
            session={session}
            setSession={setSession}
            clearSession={resetSession}
        />
    );
}
