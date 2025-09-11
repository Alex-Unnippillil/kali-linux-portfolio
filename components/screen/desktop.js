"use client";

import { isBrowser } from '@/utils/env';
import React, { Component } from 'react';
import dynamic from 'next/dynamic';
import logger from '../../utils/logger';

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
import WorkspaceSwitcher from './workspace-switcher'
import LauncherCreator from './launcher-creator'
import DesktopMenu from '../context-menus/desktop-menu';
import DefaultMenu from '../context-menus/default';
import AppMenu from '../context-menus/app-menu';
import Taskbar from './taskbar';
import TaskbarMenu from '../context-menus/taskbar-menu';
import WindowMenu from '../context-menus/window-menu';
import ReactGA from 'react-ga4';
import { toPng } from 'html-to-image';
import { safeLocalStorage } from '../../utils/safeStorage';
import { useSnapSetting } from '../../hooks/usePersistentState';
import { addRecentApp, getRecentApps } from '../../utils/recent';
import osdService from '../../utils/osdService';

export class Desktop extends Component {
    constructor() {
        super();
        this.app_stack = [];
        this.initFavourite = {};
        this.allWindowClosed = false;
        this.windowRefs = {};
        this.state = {
            focused_windows: {},
            closed_windows: {},
            currentWorkspace: 0,
            window_workspaces: {},
            allAppsView: false,
            overlapped_windows: {},
            disabled_apps: {},
            favourite_apps: {},
            hideSideBar: false,
            minimized_windows: {},
            window_positions: {},
            desktop_apps: [],
            dock: [],
            recentApps: getRecentApps(),
            context_menus: {
                desktop: false,
                default: false,
                app: false,
                taskbar: false,
                window: false,
            },
            context_app: null,
            showNameBar: false,
            showShortcutSelector: false,
            showLauncherCreator: false,
            showWindowSwitcher: false,
            switcherWindows: [],
            showWorkspaceSwitcher: false,
            switcherWorkspaces: [],
        }
    }

    componentDidMount() {
        // google analytics
        ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });

        this.fetchAppsData(() => {
            const session = this.props.session || {};
            const positions = {};
            if (session.windows && session.windows.length) {
                session.windows.forEach(({ id, x, y, snap }) => {
                    positions[id] = { x, y, snap };
                });
                this.setState({ window_positions: positions }, () => {
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
        this.checkForLaunchers();
        this.updateTrashIcon();
        window.addEventListener('trash-change', this.updateTrashIcon);
        document.addEventListener('keydown', this.handleGlobalShortcut);
        document.addEventListener('mousedown', this.handleMouseShortcut);
        window.addEventListener('open-app', this.handleOpenAppEvent);

        // Warm commonly used modules during idle periods so the first
        // interaction is snappy even on a cold cache. Falling back to
        // setTimeout ensures compatibility with environments lacking
        // requestIdleCallback.
        if (isBrowser()) {
            const warmModules = () => {
                import('../apps/terminal');
                import('../../apps/terminal/tabs');
                import('../apps/file-explorer');
                import('../apps/settings');
            };
            if ('requestIdleCallback' in window) {
                requestIdleCallback(warmModules);
            } else {
                setTimeout(warmModules, 0);
            }
        }
    }

    componentWillUnmount() {
        this.removeContextListeners();
        document.removeEventListener('keydown', this.handleGlobalShortcut);
        document.removeEventListener('mousedown', this.handleMouseShortcut);
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
        document.addEventListener('open-settings', (e) => {
            const tab = e.detail && e.detail.tab;
            if (tab) {
                window.localStorage.setItem('settings-open-tab', tab);
            }
            this.openApp('settings');
        });
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
        }
        else if (e.altKey && e.key === 'F4') {
            e.preventDefault();
            const id = this.getFocusedWindowId();
            if (id) this.closeApp(id);
        }
        else if (e.ctrlKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            this.switchWorkspace(e.key === 'ArrowRight' ? 1 : -1);
        }
        else if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'w') {
            e.preventDefault();
            if (!this.state.showWorkspaceSwitcher) {
                this.openWorkspaceSwitcher();
            }
        }
        else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            this.openApp('clipboard-manager');
        }
        else if (e.altKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            this.cycleAppWindows(e.shiftKey ? -1 : 1);
        }
        else if (e.altKey && e.code === 'Space') {
            e.preventDefault();
            const id = this.getFocusedWindowId();
            if (id) {
                const node = document.getElementById(id);
                if (node) {
                    const rect = node.getBoundingClientRect();
                    const fakeEvent = { pageX: rect.left, pageY: rect.top + rect.height };
                    this.setState({ context_app: id }, () => this.showContextMenu(fakeEvent, 'window'));
                }
            }
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

    handleMouseShortcut = (e) => {
        if (e.ctrlKey && e.altKey && e.button === 1) {
            e.preventDefault();
            if (!this.state.showWorkspaceSwitcher) {
                this.openWorkspaceSwitcher();
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

    openWorkspaceSwitcher = () => {
        const WORKSPACE_COUNT = 3;
        let names = [];
        try {
            const stored = window.localStorage.getItem('workspaces');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) names = parsed;
            }
        } catch { /* ignore */ }
        const workspaces = Array.from({ length: WORKSPACE_COUNT }, (_, i) => ({
            id: i,
            name: typeof names[i] === 'string' && names[i].trim() ? names[i] : `Workspace ${i + 1}`,
        }));
        this.setState({
            showWorkspaceSwitcher: true,
            switcherWorkspaces: workspaces,
        });
    }

    switchWorkspace = (direction) => {
        const WORKSPACE_COUNT = 3;
        let nextWs = 0;
        this.setState(prev => {
            nextWs = (prev.currentWorkspace + direction + WORKSPACE_COUNT) % WORKSPACE_COUNT;
            const closed_windows = { ...prev.closed_windows };
            const focused_windows = { ...prev.focused_windows };
            Object.keys(prev.window_workspaces).forEach(id => {
                const same = prev.window_workspaces[id] === nextWs;
                closed_windows[id] = !same;
                if (!same) focused_windows[id] = false;
            });
            return { currentWorkspace: nextWs, closed_windows, focused_windows };
        }, () => {
            let name = `Workspace ${nextWs + 1}`;
            try {
                const stored = window.localStorage.getItem('workspaces');
                if (stored) {
                    const names = JSON.parse(stored);
                    if (Array.isArray(names) && typeof names[nextWs] === 'string' && names[nextWs].trim()) {
                        name = names[nextWs];
                    }
                }
            } catch { /* ignore */ }
            const message = `Workspace ${nextWs + 1} — ${name}`;
            osdService.show(message, 1200);
            this.giveFocusToLastApp();
        });
    }

    goToWorkspace = (index) => {
        const WORKSPACE_COUNT = 3;
        const target = ((index % WORKSPACE_COUNT) + WORKSPACE_COUNT) % WORKSPACE_COUNT;
        this.setState(prev => {
            const closed_windows = { ...prev.closed_windows };
            const focused_windows = { ...prev.focused_windows };
            Object.keys(prev.window_workspaces).forEach(id => {
                const same = prev.window_workspaces[id] === target;
                closed_windows[id] = !same;
                if (!same) focused_windows[id] = false;
            });
            return { currentWorkspace: target, closed_windows, focused_windows };
        }, () => {
            let name = `Workspace ${target + 1}`;
            try {
                const stored = window.localStorage.getItem('workspaces');
                if (stored) {
                    const names = JSON.parse(stored);
                    if (Array.isArray(names) && typeof names[target] === 'string' && names[target].trim()) {
                        name = names[target];
                    }
                }
            } catch { /* ignore */ }
            const message = `Workspace ${target + 1} — ${name}`;
            osdService.show(message, 1200);
            this.giveFocusToLastApp();
        });
    }

    closeWindowSwitcher = () => {
        this.setState({ showWindowSwitcher: false, switcherWindows: [] });
    }

    selectWindow = (id) => {
        this.setState({ showWindowSwitcher: false, switcherWindows: [] }, () => {
            this.openApp(id);
        });
    }

    closeWorkspaceSwitcher = () => {
        this.setState({ showWorkspaceSwitcher: false, switcherWorkspaces: [] });
    }

    selectWorkspace = (id) => {
        this.setState({ showWorkspaceSwitcher: false, switcherWorkspaces: [] }, () => {
            this.goToWorkspace(id);
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
            case "window":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Window Context Menu`
                });
                this.setState({ context_app: appId }, () => this.showContextMenu(e, "window"));
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
            case "window":
                ReactGA.event({ category: `Context Menu`, action: `Opened Window Context Menu` });
                this.setState({ context_app: appId }, () => this.showContextMenu(fakeEvent, "window"));
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
        let pinnedApps = [];
        try {
            const stored = safeLocalStorage?.getItem('pinnedApps');
            if (stored) {
                pinnedApps = JSON.parse(stored);
            } else if (this.props.session?.dock && this.props.session.dock.length) {
                pinnedApps = this.props.session.dock;
                safeLocalStorage?.setItem('pinnedApps', JSON.stringify(pinnedApps));
            } else {
                pinnedApps = apps.filter(app => app.favourite).map(app => app.id);
                safeLocalStorage?.setItem('pinnedApps', JSON.stringify(pinnedApps));
            }
        } catch {
            pinnedApps = apps.filter(app => app.favourite).map(app => app.id);
        }
        apps.forEach(app => { app.favourite = pinnedApps.includes(app.id); });

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
            desktop_apps,
            dock: pinnedApps
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
        apps.forEach((app, index) => {
            if (this.state.closed_windows[app.id] === false) {

                const pos = this.state.window_positions[app.id];
                const index = this.app_stack.indexOf(app.id);
                const zIndex = 100 + (index === -1 ? 0 : index);
                const props = {
                    title: app.title,
                    id: app.id,
                    screen: app.screen,
                    addFolder: this.addToDesktop,
                    closed: this.closeApp,
                    openApp: this.openApp,
                    focus: this.focus,
                    isFocused: this.state.focused_windows[app.id],
                    zIndex,
                    hideSideBar: this.hideSideBar,
                    hasMinimised: this.hasMinimised,
                    minimized: this.state.minimized_windows[app.id],
                    resizable: app.resizable,
                    allowMaximize: app.allowMaximize,
                    defaultWidth: app.defaultWidth,
                    defaultHeight: app.defaultHeight,
                    initialX: pos ? pos.x : undefined,
                    initialY: pos ? pos.y : undefined,
                    initialSnap: pos ? pos.snap : undefined,
                    onPositionChange: (x, y, snap) => this.updateWindowPosition(app.id, x, y, snap),
                    snapEnabled: this.props.snapEnabled,
                }

                windowsJsx.push(
                    <Window
                        key={app.id}
                        ref={ref => { if (ref) this.windowRefs[app.id] = ref; }}
                        {...props}
                    />
                )
            }
        });
        return windowsJsx;
    }

    updateWindowPosition = (id, x, y, snapPos = null) => {
        const snap = this.props.snapEnabled
            ? (v) => Math.round(v / 8) * 8
            : (v) => v;
        this.setState(prev => ({
            window_positions: {
                ...prev.window_positions,
                [id]: { x: snap(x), y: snap(y), snap: snapPos }
            }
        }), this.saveSession);
    }

    saveSession = () => {
        if (!this.props.setSession) return;
        const openWindows = Object.keys(this.state.closed_windows).filter(id => this.state.closed_windows[id] === false);
        const windows = openWindows.map(id => ({
            id,
            x: this.state.window_positions[id] ? this.state.window_positions[id].x : 60,
            y: this.state.window_positions[id] ? this.state.window_positions[id].y : 10,
            snap: this.state.window_positions[id] ? this.state.window_positions[id].snap : null,
        }));
        const dock = this.state.dock;
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
            for (const index in this.app_stack) {
                const id = this.app_stack[index];
                if (!this.state.closed_windows[id] && !this.state.minimized_windows[id]) {
                    this.focus(id);
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

        const appMeta = apps.find(a => a.id === objId);
        if (appMeta && appMeta.command) {
            if (/^https?:\/\//.test(appMeta.command)) {
                window.open(appMeta.command, '_blank');
            } else if (appMeta.command !== objId) {
                this.openApp(appMeta.command);
            }
            return;
        }

        // if app is already open, focus it instead of spawning a new window
        if (this.state.closed_windows[objId] === false) {
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
            let window_workspaces = this.state.window_workspaces;
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

            setTimeout(() => {
                favourite_apps[objId] = true; // adds opened app to sideBar
                closed_windows[objId] = false; // openes app's window
                window_workspaces[objId] = this.state.currentWorkspace;
                this.setState({ closed_windows, favourite_apps, window_workspaces, allAppsView: false }, () => {
                    this.focus(objId);
                    this.saveSession();
                });
                this.app_stack.push(objId);
                const recentApps = addRecentApp(objId);
                this.setState({ recentApps });
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
            path: objId,
        });
        safeLocalStorage?.setItem('window-trash', JSON.stringify(trash));
        this.updateTrashIcon();

        // remove app from the app stack
        this.app_stack.splice(this.app_stack.indexOf(objId), 1);

        this.giveFocusToLastApp();

        this.hideSideBar(null, false);

        // close window
        let closed_windows = this.state.closed_windows;
        let favourite_apps = this.state.favourite_apps;
        let window_workspaces = { ...this.state.window_workspaces };

        if (this.initFavourite[objId] === false) favourite_apps[objId] = false; // if user default app is not favourite, remove from sidebar
        closed_windows[objId] = true; // closes the app's window
        delete window_workspaces[objId];

        this.setState({ closed_windows, favourite_apps, window_workspaces }, this.saveSession);
    }

    pinApp = (id) => {
        let favourite_apps = { ...this.state.favourite_apps };
        favourite_apps[id] = true;
        this.initFavourite[id] = true;
        const app = apps.find(a => a.id === id);
        if (app) app.favourite = true;
        const dock = this.state.dock.includes(id) ? [...this.state.dock] : [...this.state.dock, id];
        safeLocalStorage?.setItem('pinnedApps', JSON.stringify(dock));
        this.setState({ favourite_apps, dock }, () => { this.saveSession(); });
        this.hideAllContextMenu();
    }

    unpinApp = (id) => {
        let favourite_apps = { ...this.state.favourite_apps };
        if (this.state.closed_windows[id]) favourite_apps[id] = false;
        this.initFavourite[id] = false;
        const app = apps.find(a => a.id === id);
        if (app) app.favourite = false;
        const dock = this.state.dock.filter(appId => appId !== id);
        safeLocalStorage?.setItem('pinnedApps', JSON.stringify(dock));
        this.setState({ favourite_apps, dock }, () => { this.saveSession(); });
        this.hideAllContextMenu();
    }

    reorderDock = (dock) => {
        safeLocalStorage?.setItem('pinnedApps', JSON.stringify(dock));
        this.setState({ dock }, () => { this.saveSession(); });
    }

    focus = (objId) => {
        // removes focus from all windows and gives focus to window with 'id = objId'
        const focused_windows = { ...this.state.focused_windows };
        focused_windows[objId] = true;
        for (const key in focused_windows) {
            if (key !== objId) {
                focused_windows[key] = false;
            }
        }
        this.setState({ focused_windows }, () => {
            this.windowRefs[objId]?.focusSelf?.();
        });

        const index = this.app_stack.indexOf(objId);
        if (index !== -1) {
            this.app_stack.splice(index, 1);
        }
        this.app_stack.push(objId);
    }

    addNewFolder = () => {
        this.setState({ showNameBar: true });
    }

    openShortcutSelector = () => {
        this.setState({ showShortcutSelector: true });
    }

    openLauncherCreator = () => {
        this.setState({ showLauncherCreator: true });
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

    createLauncher = ({ name, comment, icon, command }) => {
        const id = name.trim().replace(/\s+/g, '-').toLowerCase();
        const finalIcon = icon || '/themes/Yaru/apps/bash.png';
        apps.push({
            id,
            title: name,
            icon: finalIcon,
            comment,
            command,
            disabled: false,
            favourite: false,
            desktop_shortcut: true,
            screen: () => { },
        });
        let launchers = [];
        try { launchers = JSON.parse(safeLocalStorage?.getItem('custom_launchers') || '[]'); } catch (e) { launchers = []; }
        launchers.push({ id, title: name, icon: finalIcon, comment, command });
        safeLocalStorage?.setItem('custom_launchers', JSON.stringify(launchers));
        this.setState({ showLauncherCreator: false }, this.updateAppsData);
    }

    checkForLaunchers = () => {
        const stored = safeLocalStorage?.getItem('custom_launchers');
        if (!stored) {
            safeLocalStorage?.setItem('custom_launchers', JSON.stringify([]));
            return;
        }
        try {
            JSON.parse(stored).forEach(l => {
                apps.push({
                    id: l.id,
                    title: l.title,
                    icon: l.icon || '/themes/Yaru/apps/bash.png',
                    comment: l.comment,
                    command: l.command,
                    disabled: false,
                    favourite: false,
                    desktop_shortcut: true,
                    screen: () => { },
                });
            });
            this.updateAppsData();
        } catch (e) {
            safeLocalStorage?.setItem('custom_launchers', JSON.stringify([]));
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
            const count = trash.length;
            let shouldUpdate = false;
            if (apps[appIndex].icon !== icon) {
                apps[appIndex].icon = icon;
                shouldUpdate = true;
            }
            if (apps[appIndex].tasks !== count) {
                apps[appIndex].tasks = count;
                shouldUpdate = true;
            }
            if (shouldUpdate) {
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
                    <input className="outline-none mt-5 px-1 w-10/12  context-menu-bg border-2 border-blue-700 rounded py-0.5" id="folder-name-input" type="text" autoComplete="off" spellCheck="false" autoFocus={true} aria-label="Folder name" />
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
                    dock={this.state.dock}
                    hide={this.state.hideSideBar}
                    hideSideBar={this.hideSideBar}
                    favourite_apps={this.state.favourite_apps}
                    showAllApps={this.showAllApps}
                    allAppsView={this.state.allAppsView}
                    closed_windows={this.state.closed_windows}
                    focused_windows={this.state.focused_windows}
                    isMinimized={this.state.minimized_windows}
                    openAppByAppId={this.openApp}
                    reorderDock={this.reorderDock}
                />

                {/* Taskbar */}
                <Taskbar
                    apps={apps}
                    closed_windows={this.state.closed_windows}
                    minimized_windows={this.state.minimized_windows}
                    focused_windows={this.state.focused_windows}
                    dock={this.state.dock}
                    openApp={this.openApp}
                    minimize={this.hasMinimised}
                />

                {/* Desktop Apps */}
                {this.renderDesktopApps()}

                {/* Context Menus */}
                <DesktopMenu
                    active={this.state.context_menus.desktop}
                    onClose={this.hideAllContextMenu}
                    openApp={this.openApp}
                    addNewFolder={this.addNewFolder}
                    openShortcutSelector={this.openShortcutSelector}
                    openLauncherCreator={this.openLauncherCreator}
                    clearSession={() => { this.props.clearSession(); window.location.reload(); }}
                />
                <DefaultMenu active={this.state.context_menus.default} onClose={this.hideAllContextMenu} />
                <AppMenu
                    active={this.state.context_menus.app}
                    pinned={this.initFavourite[this.state.context_app]}
                    pinApp={() => this.pinApp(this.state.context_app)}
                    unpinApp={() => this.unpinApp(this.state.context_app)}
                    openMenuEditor={() => this.openApp('settings')}
                    addToPanel={() => { const id = this.state.context_app; if (id) logger.info('Add to panel', id); }}
                    addToDesktop={() => { const id = this.state.context_app; if (id) this.addShortcutToDesktop(id); }}
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
                <WindowMenu
                    active={this.state.context_menus.window}
                    onMove={() => { const id = this.state.context_app; if (id) this.windowRefs[id]?.changeCursorToMove(); }}
                    onResize={() => { const id = this.state.context_app; if (id) this.windowRefs[id]?.startResize(); }}
                    onTop={() => { const id = this.state.context_app; if (id) this.windowRefs[id]?.toggleAlwaysOnTop(); }}
                    onShade={() => { const id = this.state.context_app; if (id) this.windowRefs[id]?.toggleShade(); }}
                    onStick={() => { const id = this.state.context_app; if (id) this.windowRefs[id]?.toggleStick(); }}
                    onMaximize={() => { const id = this.state.context_app; if (id) this.windowRefs[id]?.maximizeWindow(); }}
                    onClose={() => { const id = this.state.context_app; if (id) this.closeApp(id); }}
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
                        recentApps={this.state.recentApps}
                        openApp={this.openApp} /> : null}

                { this.state.showShortcutSelector ?
                    <ShortcutSelector apps={apps}
                        games={games}
                        onSelect={this.addShortcutToDesktop}
                        onClose={() => this.setState({ showShortcutSelector: false })} /> : null}

                { this.state.showLauncherCreator ?
                    <LauncherCreator
                        onSave={this.createLauncher}
                        onClose={() => this.setState({ showLauncherCreator: false })} /> : null}

                { this.state.showWindowSwitcher ?
                    <WindowSwitcher
                        windows={this.state.switcherWindows}
                        onSelect={this.selectWindow}
                        onClose={this.closeWindowSwitcher} /> : null}

                { this.state.showWorkspaceSwitcher ?
                    <WorkspaceSwitcher
                        workspaces={this.state.switcherWorkspaces}
                        active={this.state.currentWorkspace}
                        onSelect={this.selectWorkspace}
                        onClose={this.closeWorkspaceSwitcher} /> : null}

            </main>
        )
    }
}

export default function DesktopWithSnap(props) {
    const [snapEnabled] = useSnapSetting();
    return <Desktop {...props} snapEnabled={snapEnabled} />;
}
