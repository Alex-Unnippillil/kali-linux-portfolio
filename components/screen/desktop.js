"use client";

import React, { Component } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

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
import WindowControlsMenu from '../context-menus/window-controls-menu';
import ReactGA from 'react-ga4';
import { toPng } from 'html-to-image';
import { safeLocalStorage } from '../../utils/safeStorage';
import { useSnapSetting } from '../../hooks/usePersistentState';
import useVirtualDesktops from '../../hooks/useVirtualDesktops';

export class Desktop extends Component {
    constructor() {
        super();
        this.app_stack = [];
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
            context_menus: {
                desktop: false,
                default: false,
                app: false,
                taskbar: false,
                windowControls: false,
            },
            context_app: null,
            showNameBar: false,
            showShortcutSelector: false,
            showWindowSwitcher: false,
            switcherDesktops: [],
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

    componentDidUpdate(prevProps) {
        const prevManager = prevProps.virtualDesktops;
        const currentManager = this.props.virtualDesktops;
        if ((prevManager && currentManager && prevManager.activeDesktopId !== currentManager.activeDesktopId)
            || prevManager?.windowAssignments !== currentManager?.windowAssignments) {
            this.syncFocusWithActiveDesktop();
        }
        if (this.state.showWindowSwitcher && prevManager && currentManager && prevManager.desktops !== currentManager.desktops) {
            this.setState({ switcherDesktops: currentManager.desktops });
        }
    }

    componentWillUnmount() {
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
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            if (!this.state.showWindowSwitcher) {
                this.openWindowSwitcher();
            } else if (typeof window !== 'undefined') {
                const direction = e.shiftKey ? -1 : 1;
                window.dispatchEvent(new CustomEvent('desktop-switcher-cycle', { detail: direction }));
            }
        } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            this.openApp('clipboard-manager');
        }
        else if (e.altKey && (e.key === '`' || e.key === '~')) {
            e.preventDefault();
            this.cycleAppWindows(e.shiftKey ? -1 : 1);
        }
        else if (e.ctrlKey && e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            this.cycleDesktops(e.key === 'ArrowRight' ? 1 : -1);
        }
        else if (e.metaKey && !e.ctrlKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
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
            if (this.state.focused_windows[key] && this.isWindowOnActiveDesktop(key)) {
                return key;
            }
        }
        return null;
    }

    cycleApps = (direction) => {
        const visibleStack = this.app_stack.filter((id) =>
            this.state.closed_windows[id] === false && this.isWindowOnActiveDesktop(id),
        );
        if (!visibleStack.length) return;
        const currentId = this.getFocusedWindowId();
        let index = currentId ? visibleStack.indexOf(currentId) : -1;
        if (index === -1) {
            const first = visibleStack[direction > 0 ? 0 : visibleStack.length - 1];
            if (first) {
                this.focus(first);
            }
            return;
        }
        let next = (index + direction + visibleStack.length) % visibleStack.length;
        for (let i = 0; i < visibleStack.length; i++) {
            const id = visibleStack[next];
            if (!this.state.minimized_windows[id]) {
                this.focus(id);
                break;
            }
            next = (next + direction + visibleStack.length) % visibleStack.length;
        }
    }

    cycleAppWindows = (direction) => {
        const currentId = this.getFocusedWindowId();
        if (!currentId) return;
        const base = currentId.split('#')[0];
        const windows = this.app_stack.filter(id => id.startsWith(base) && this.isWindowOnActiveDesktop(id));
        if (windows.length <= 1) return;
        let index = windows.indexOf(currentId);
        let next = (index + direction + windows.length) % windows.length;
        this.focus(windows[next]);
    }

    cycleDesktops = (direction) => {
        const manager = this.getDesktopManager();
        if (!manager || manager.desktops.length <= 1) return;
        const desktops = manager.desktops;
        const activeId = manager.activeDesktopId;
        const currentIndex = desktops.findIndex(desktop => desktop.id === activeId);
        if (currentIndex === -1) return;
        const nextIndex = (currentIndex + direction + desktops.length) % desktops.length;
        const nextDesktop = desktops[nextIndex];
        if (nextDesktop) {
            this.scheduleFrame(() => manager.setActiveDesktop(nextDesktop.id));
        }
    }

    getDesktopManager = () => this.props.virtualDesktops;

    getActiveDesktopId = () => {
        const manager = this.getDesktopManager();
        return manager ? manager.activeDesktopId : null;
    }

    getWindowDesktopId = (windowId) => {
        const manager = this.getDesktopManager();
        if (!manager) return null;
        return manager.getWindowDesktopId(windowId) || manager.activeDesktopId;
    }

    isWindowOnActiveDesktop = (windowId) => {
        const manager = this.getDesktopManager();
        if (!manager) return true;
        const assigned = manager.getWindowDesktopId(windowId);
        const target = assigned || manager.activeDesktopId;
        return target === manager.activeDesktopId;
    }

    scheduleFrame = (callback) => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            window.requestAnimationFrame(callback);
        } else {
            callback();
        }
    }

    syncFocusWithActiveDesktop = () => {
        const manager = this.getDesktopManager();
        if (!manager) return;
        const currentFocused = this.getFocusedWindowId();
        if (currentFocused && this.isWindowOnActiveDesktop(currentFocused) && !this.state.minimized_windows[currentFocused]) {
            return;
        }
        const candidates = this.app_stack.filter((id) =>
            this.state.closed_windows[id] === false && this.isWindowOnActiveDesktop(id),
        );
        if (!candidates.length) {
            if (currentFocused) {
                const focused_windows = { ...this.state.focused_windows };
                focused_windows[currentFocused] = false;
                this.setState({ focused_windows });
            }
            return;
        }
        const target = candidates.find((id) => !this.state.minimized_windows[id]) || candidates[0];
        this.focus(target);
    }

    openWindowSwitcher = () => {
        const manager = this.getDesktopManager();
        if (manager && manager.desktops.length) {
            this.setState({ showWindowSwitcher: true, switcherDesktops: manager.desktops });
        }
    }

    closeWindowSwitcher = () => {
        this.setState({ showWindowSwitcher: false, switcherDesktops: [] });
    }

    selectDesktop = (id) => {
        const manager = this.getDesktopManager();
        this.setState({ showWindowSwitcher: false, switcherDesktops: [] }, () => {
            if (!manager) return;
            this.scheduleFrame(() => manager.setActiveDesktop(id));
        });
    }

    moveWindowToDesktop = (desktopId) => {
        const manager = this.getDesktopManager();
        const windowId = this.state.context_app;
        if (!manager || !windowId) return;
        this.hideAllContextMenu();
        this.scheduleFrame(() => {
            manager.moveWindowToDesktop(windowId, desktopId);
            if (desktopId === manager.activeDesktopId) {
                this.focus(windowId);
                return;
            }
            if (this.state.focused_windows[windowId]) {
                this.setState(prev => ({
                    focused_windows: { ...prev.focused_windows, [windowId]: false },
                }), () => {
                    this.giveFocusToLastApp();
                });
            } else {
                this.giveFocusToLastApp();
            }
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
            case "window-controls":
                ReactGA.event({
                    category: `Context Menu`,
                    action: `Opened Window Controls Context Menu`
                });
                this.setState({ context_app: appId }, () => this.showContextMenu(e, "windowControls"));
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
            case "window-controls":
                ReactGA.event({ category: `Context Menu`, action: `Opened Window Controls Context Menu` });
                this.setState({ context_app: appId }, () => this.showContextMenu(fakeEvent, "windowControls"));
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
        apps.forEach((app, index) => {
            if (this.state.closed_windows[app.id] === false && this.isWindowOnActiveDesktop(app.id)) {

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
                if (this.state.closed_windows[id]) continue;
                if (!this.isWindowOnActiveDesktop(id)) continue;
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
            if (!this.state.closed_windows[key] && this.isWindowOnActiveDesktop(key)) { // if app is opened on active desktop
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

        const desktopManager = this.getDesktopManager();
        if (desktopManager) {
            desktopManager.ensureWindowOnDesktop(objId, desktopManager.activeDesktopId);
        }

        // if the app is disabled
        if (this.state.disabled_apps[objId]) return;

        // if app is already open, focus it instead of spawning a new window
        if (this.state.closed_windows[objId] === false) {
            if (desktopManager) {
                const assignedDesktop = desktopManager.getWindowDesktopId(objId);
                if (assignedDesktop && assignedDesktop !== desktopManager.activeDesktopId) {
                    this.scheduleFrame(() => desktopManager.setActiveDesktop(assignedDesktop));
                }
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

            setTimeout(() => {
                favourite_apps[objId] = true; // adds opened app to sideBar
                closed_windows[objId] = false; // openes app's window
                this.setState({ closed_windows, favourite_apps, allAppsView: false }, () => {
                    this.focus(objId);
                    this.saveSession();
                });
                this.app_stack.push(objId);
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
        this.app_stack.splice(this.app_stack.indexOf(objId), 1);

        this.giveFocusToLastApp();

        this.hideSideBar(null, false);

        // close window
        let closed_windows = this.state.closed_windows;
        let favourite_apps = this.state.favourite_apps;

        if (this.initFavourite[objId] === false) favourite_apps[objId] = false; // if user default app is not favourite, remove from sidebar
        closed_windows[objId] = true; // closes the app's window

        const desktopManager = this.getDesktopManager();
        if (desktopManager) {
            desktopManager.removeWindowAssignment(objId);
        }

        this.setState({ closed_windows, favourite_apps }, this.saveSession);
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
        if (!this.isWindowOnActiveDesktop(objId)) {
            return;
        }
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
        const desktopManager = this.getDesktopManager();
        const desktops = desktopManager ? desktopManager.desktops : [];
        const activeDesktopId = desktopManager ? desktopManager.activeDesktopId : null;
        return (
            <main id="desktop" role="main" className={" h-full w-full flex flex-col items-end justify-start content-start flex-wrap-reverse pt-8 bg-transparent relative overflow-hidden overscroll-none window-parent"}>

                <WorkspaceTabs
                    desktops={desktops}
                    activeDesktopId={activeDesktopId}
                    onSelect={this.selectDesktop}
                    onReorder={desktopManager ? desktopManager.reorderDesktops : undefined}
                />

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
                <WindowControlsMenu
                    active={this.state.context_menus.windowControls}
                    desktops={desktops}
                    activeDesktopId={activeDesktopId}
                    onMove={this.moveWindowToDesktop}
                    onClose={this.hideAllContextMenu}
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
                        desktops={this.state.switcherDesktops.length ? this.state.switcherDesktops : desktops}
                        activeDesktopId={activeDesktopId}
                        onSelect={this.selectDesktop}
                        onClose={this.closeWindowSwitcher}
                        onReorder={desktopManager ? desktopManager.reorderDesktops : undefined}
                    /> : null}

            </main>
        )
    }
}

function WorkspaceTabs({ desktops = [], activeDesktopId, onSelect, onReorder }) {
    const [draggedId, setDraggedId] = React.useState(null);
    const [dragOverId, setDragOverId] = React.useState(null);

    if (!desktops.length) {
        return null;
    }

    const canDrag = typeof onReorder === 'function' && desktops.length > 1;

    const handleSelect = (desktopId) => {
        if (typeof onSelect === 'function') {
            onSelect(desktopId);
        }
    };

    const handleDragStart = (desktopId) => (event) => {
        if (!canDrag) return;
        setDraggedId(desktopId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('application/x-virtual-desktop-id', desktopId);
    };

    const handleDragOver = (desktopId) => (event) => {
        if (!canDrag) return;
        event.preventDefault();
        if (draggedId && draggedId !== desktopId) {
            setDragOverId(desktopId);
        }
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDragLeave = (desktopId) => () => {
        if (dragOverId === desktopId) {
            setDragOverId(null);
        }
    };

    const handleDrop = (desktopId) => (event) => {
        if (!canDrag) return;
        event.preventDefault();
        const sourceId = event.dataTransfer.getData('application/x-virtual-desktop-id') || draggedId;
        setDragOverId(null);
        setDraggedId(null);
        if (sourceId && sourceId !== desktopId && typeof onReorder === 'function') {
            onReorder(sourceId, desktopId);
        }
    };

    const handleDragEnd = () => {
        setDragOverId(null);
        setDraggedId(null);
    };

    return (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex gap-2">
            {desktops.map((desktop) => {
                const isActive = desktop.id === activeDesktopId;
                const isDropTarget = dragOverId === desktop.id;
                return (
                    <button
                        key={desktop.id}
                        type="button"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors border ${isActive ? 'bg-ub-orange text-black border-ub-orange' : 'bg-black bg-opacity-40 text-white border-transparent hover:bg-white hover:bg-opacity-20'} ${isDropTarget ? 'ring-2 ring-ub-orange' : ''}`}
                        onClick={() => handleSelect(desktop.id)}
                        draggable={canDrag}
                        onDragStart={handleDragStart(desktop.id)}
                        onDragOver={handleDragOver(desktop.id)}
                        onDragEnter={handleDragOver(desktop.id)}
                        onDragLeave={handleDragLeave(desktop.id)}
                        onDrop={handleDrop(desktop.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <Image
                            src={desktop.icon}
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6"
                            sizes="24px"
                        />
                        <span className="text-sm font-medium truncate max-w-[8rem]">{desktop.name}</span>
                    </button>
                );
            })}
        </div>
    );
}

export default function DesktopWithSnap(props) {
    const [snapEnabled] = useSnapSetting();
    const virtualDesktops = useVirtualDesktops();
    return <Desktop {...props} snapEnabled={snapEnabled} virtualDesktops={virtualDesktops} />;
}
