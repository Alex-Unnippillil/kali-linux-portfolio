import React, { PureComponent } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { NAVBAR_HEIGHT } from '../../utils/uiConstants';

const areWorkspacesEqual = (next, prev) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                if (next[index] !== prev[index]) {
                        return false;
                }
        }
        return true;
};

const areRunningAppsEqual = (next = [], prev = []) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                const a = next[index];
                const b = prev[index];
                if (!b) return false;
                if (
                        a.id !== b.id ||
                        a.title !== b.title ||
                        a.icon !== b.icon ||
                        a.isFocused !== b.isFocused ||
                        a.isMinimized !== b.isMinimized
                ) {
                        return false;
                }
        }
        return true;
};

const areArraysEqual = (next = [], prev = []) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                if (next[index] !== prev[index]) {
                        return false;
                }
        }
        return true;
};

export default class Navbar extends PureComponent {
        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false,
                        workspaces: [],
                        activeWorkspace: 0,
                        runningApps: [],
                        overflowAppIds: [],
                        isOverflowMenuOpen: false
                };
                this.taskbarContainerRef = React.createRef();
                this.taskbarListRef = React.createRef();
                this.overflowMenuRef = React.createRef();
                this.overflowButtonRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.overflowUpdateCancel = null;
                this.resizeObserver = null;
                this.wheelListenerTarget = null;
                this.overflowMenuFirstItemRef = React.createRef();
                this.appRefHandlers = new Map();
        }

        componentDidMount() {
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                        window.addEventListener('resize', this.handleWindowResize);
                        this.attachTaskbarListListeners();
                        this.setupResizeObserver();
                        this.scheduleOverflowUpdate();
                }
        }

        componentWillUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.removeEventListener('resize', this.handleWindowResize);
                }
                if (this.resizeObserver) {
                        this.resizeObserver.disconnect();
                        this.resizeObserver = null;
                }
                if (this.wheelListenerTarget) {
                        this.wheelListenerTarget.removeEventListener('wheel', this.handleTaskbarWheel);
                        this.wheelListenerTarget = null;
                }
                if (typeof document !== 'undefined') {
                        document.removeEventListener('mousedown', this.handleDocumentPointerDown);
                        document.removeEventListener('touchstart', this.handleDocumentPointerDown);
                        document.removeEventListener('keydown', this.handleOverflowKeyDown);
                }
                if (this.overflowUpdateCancel) {
                        this.overflowUpdateCancel();
                        this.overflowUpdateCancel = null;
                }
        }

        componentDidUpdate(prevProps, prevState) {
                if (prevState.runningApps !== this.state.runningApps) {
                        this.attachTaskbarListListeners();
                        this.scheduleOverflowUpdate();
                }

                if (prevState.isOverflowMenuOpen !== this.state.isOverflowMenuOpen) {
                        if (this.state.isOverflowMenuOpen) {
                                if (typeof document !== 'undefined') {
                                        document.addEventListener('mousedown', this.handleDocumentPointerDown);
                                        document.addEventListener('touchstart', this.handleDocumentPointerDown);
                                        document.addEventListener('keydown', this.handleOverflowKeyDown);
                                }
                                const focusTarget = this.overflowMenuFirstItemRef?.current;
                                if (focusTarget && typeof focusTarget.focus === 'function') {
                                        focusTarget.focus();
                                }
                        } else if (typeof document !== 'undefined') {
                                document.removeEventListener('mousedown', this.handleDocumentPointerDown);
                                document.removeEventListener('touchstart', this.handleDocumentPointerDown);
                                document.removeEventListener('keydown', this.handleOverflowKeyDown);
                        }
                }

                if (prevState.overflowAppIds !== this.state.overflowAppIds) {
                        this.scheduleOverflowUpdate();
                }
        }

        handleWorkspaceStateUpdate = (event) => {
                const detail = event?.detail || {};
                const { workspaces, activeWorkspace } = detail;
                const nextWorkspaces = Array.isArray(workspaces) ? workspaces : [];
                const nextActiveWorkspace = typeof activeWorkspace === 'number' ? activeWorkspace : 0;
                const nextRunningApps = Array.isArray(detail.runningApps) ? detail.runningApps : [];

                this.setState((previousState) => {
                        const workspacesChanged = !areWorkspacesEqual(nextWorkspaces, previousState.workspaces);
                        const activeChanged = previousState.activeWorkspace !== nextActiveWorkspace;
                        const runningAppsChanged = !areRunningAppsEqual(nextRunningApps, previousState.runningApps);

                        if (!workspacesChanged && !activeChanged && !runningAppsChanged) {
                                return null;
                        }

                        return {
                                workspaces: workspacesChanged ? nextWorkspaces : previousState.workspaces,
                                activeWorkspace: nextActiveWorkspace,
                                runningApps: runningAppsChanged ? nextRunningApps : previousState.runningApps,
                                isOverflowMenuOpen:
                                        runningAppsChanged && nextRunningApps.length === 0 ? false : previousState.isOverflowMenuOpen
                        };
                }, this.scheduleOverflowUpdate);
        };

        dispatchTaskbarCommand = (detail) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
        };

        handleAppButtonClick = (app) => {
                const detail = { appId: app.id, action: 'toggle' };
                this.dispatchTaskbarCommand(detail);
        };

        handleAppButtonKeyDown = (event, app) => {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.handleAppButtonClick(app);
                }
        };

        renderRunningApps = () => {
                const { runningApps, overflowAppIds, isOverflowMenuOpen } = this.state;
                if (!runningApps.length) return null;

                const overflowSet = new Set(overflowAppIds);
                const overflowApps = runningApps.filter((app) => overflowSet.has(app.id));
                const hasOverflow = overflowApps.length > 0;

                return (
                        <div
                                ref={this.taskbarContainerRef}
                                className="relative flex min-w-0 items-center"
                                style={{ maxWidth: 'clamp(10rem, 45vw, 32rem)' }}
                        >
                                <ul
                                        ref={this.taskbarListRef}
                                        className="flex min-w-0 items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                        role="list"
                                        aria-label="Open applications"
                                        onDragOver={this.handleTaskbarDragOver}
                                        onDrop={this.handleTaskbarDrop}
                                        onScroll={this.handleTaskbarScroll}
                                >
                                        {runningApps.map((app) => this.renderRunningAppItem(app, overflowSet.has(app.id)))}
                                </ul>
                                {hasOverflow && this.renderOverflowButton(overflowApps, isOverflowMenuOpen)}
                        </div>
                );
        };

        renderRunningAppItem = (app, isOverflowed) => (
                <li
                        key={app.id}
                        className="flex"
                        draggable
                        data-app-id={app.id}
                        data-overflowed={isOverflowed ? 'true' : 'false'}
                        role="listitem"
                        onDragStart={(event) => this.handleAppDragStart(event, app)}
                        onDragOver={this.handleAppDragOver}
                        onDrop={(event) => this.handleAppDrop(event, app.id)}
                        onDragEnd={this.handleAppDragEnd}
                >
                        {this.renderRunningAppButton(app, isOverflowed)}
                </li>
        );

        renderRunningAppButton = (app, isOverflowed) => {
                const isActive = !app.isMinimized;
                const isFocused = app.isFocused && isActive;

                return (
                        <button
                                type="button"
                                aria-label={app.title}
                                aria-pressed={isActive}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                onClick={() => this.handleAppButtonClick(app)}
                                onKeyDown={(event) => this.handleAppButtonKeyDown(event, app)}
                                tabIndex={isOverflowed ? -1 : 0}
                                aria-hidden={isOverflowed ? true : undefined}
                                ref={this.getAppButtonRef(app.id)}
                                className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} relative flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                        >
                                <span className="relative inline-flex items-center justify-center">
                                        <Image
                                                src={app.icon}
                                                alt=""
                                                width={28}
                                                height={28}
                                                className="h-6 w-6"
                                        />
                                        {isActive && (
                                                <span
                                                        aria-hidden="true"
                                                        data-testid="running-indicator"
                                                        className="absolute -bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-current"
                                                />
                                        )}
                                </span>
                                <span className="hidden whitespace-nowrap text-white md:inline">{app.title}</span>
                        </button>
                );
        };

        renderOverflowButton = (overflowApps, isOpen) => (
                <div className="ml-1 flex items-center">
                        <button
                                type="button"
                                ref={this.overflowButtonRef}
                                className={`flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-[#1b2231]/90 text-white/80 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] ${isOpen ? 'bg-white/10' : ''}`}
                                aria-label="Show hidden applications"
                                aria-haspopup="menu"
                                aria-expanded={isOpen}
                                onClick={this.toggleOverflowMenu}
                        >
                                <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                >
                                        <path
                                                fillRule="evenodd"
                                                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.939l3.71-3.71a.75.75 0 1 1 1.06 1.061l-4.24 4.24a.75.75 0 0 1-1.06 0l-4.24-4.24a.75.75 0 0 1 .02-1.06z"
                                                clipRule="evenodd"
                                        />
                                </svg>
                        </button>
                        {isOpen && overflowApps.length > 0 && (
                                <div
                                        ref={this.overflowMenuRef}
                                        role="menu"
                                        aria-label="Hidden applications"
                                        className="absolute right-0 top-full z-[300] mt-2 w-52 rounded-md border border-white/10 bg-slate-950/95 p-2 text-xs text-white/90 shadow-xl backdrop-blur"
                                >
                                        <ul role="none" className="flex flex-col gap-1">
                                                {overflowApps.map((app, index) => (
                                                        <li role="none" key={app.id}>
                                                                <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]"
                                                                        onClick={() => this.handleOverflowMenuSelect(app)}
                                                                        ref={index === 0 ? this.overflowMenuFirstItemRef : undefined}
                                                                >
                                                                        <span className="inline-flex h-5 w-5 items-center justify-center">
                                                                                <Image src={app.icon} alt="" width={20} height={20} className="h-5 w-5" />
                                                                        </span>
                                                                        <span className="flex-1 truncate">{app.title}</span>
                                                                </button>
                                                        </li>
                                                ))}
                                        </ul>
                                </div>
                        )}
                </div>
        );

        handleTaskbarDragOver = (event) => {
                event.preventDefault();
                if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move';
                }
        };

        handleTaskbarDrop = (event) => {
                event.preventDefault();
                const sourceId = this.getDragSourceId(event);
                if (!sourceId) return;
                this.reorderRunningApps(sourceId, null, true);
        };

        handleAppDragStart = (event, app) => {
                this.draggingAppId = app.id;
                if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('application/x-taskbar-app-id', app.id);
                }
        };

        handleAppDragOver = (event) => {
                event.preventDefault();
                if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move';
                }
        };

        handleAppDrop = (event, targetId) => {
                event.preventDefault();
                const sourceId = this.getDragSourceId(event);
                if (!sourceId) return;
                const rect = event.currentTarget?.getBoundingClientRect?.();
                const insertAfter = rect ? (event.clientX - rect.left) > rect.width / 2 : false;
                this.reorderRunningApps(sourceId, targetId, insertAfter);
        };

        handleAppDragEnd = () => {
                this.draggingAppId = null;
        };

        getDragSourceId = (event) => {
                const transfer = event.dataTransfer;
                if (transfer) {
                        const explicit = transfer.getData('application/x-taskbar-app-id');
                        if (explicit) return explicit;
                }
                return this.draggingAppId;
        };

        reorderRunningApps = (sourceId, targetId, insertAfter = false) => {
                if (!sourceId) return;
                this.pendingReorder = null;
                this.setState((prevState) => {
                        const updated = this.computeReorderedApps(prevState.runningApps, sourceId, targetId, insertAfter);
                        if (!updated) return null;
                        this.pendingReorder = updated.map((item) => item.id);
                        return { runningApps: updated };
                }, () => {
                        if (this.pendingReorder) {
                                this.dispatchTaskbarCommand({ action: 'reorder', order: this.pendingReorder });
                                this.pendingReorder = null;
                        }
                        this.scheduleOverflowUpdate();
                });
        };

        computeReorderedApps = (apps, sourceId, targetId, insertAfter) => {
                if (!Array.isArray(apps) || apps.length === 0) return null;
                if (sourceId === targetId) return null;

                const list = [...apps];
                const sourceIndex = list.findIndex((item) => item.id === sourceId);
                if (sourceIndex === -1) return null;

                const [moved] = list.splice(sourceIndex, 1);

                let insertIndex;
                if (!targetId) {
                        insertIndex = insertAfter ? list.length : 0;
                } else {
                        const targetIndex = list.findIndex((item) => item.id === targetId);
                        if (targetIndex === -1) {
                                insertIndex = list.length;
                        } else {
                                insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
                        }
                }

                if (insertIndex < 0) insertIndex = 0;
                if (insertIndex > list.length) insertIndex = list.length;

                list.splice(insertIndex, 0, moved);

                const unchanged = apps.length === list.length && apps.every((item, index) => item.id === list[index].id);
                if (unchanged) return null;

                return list;
        };

        toggleOverflowMenu = () => {
                this.setState((prevState) => ({ isOverflowMenuOpen: !prevState.isOverflowMenuOpen }));
        };

        handleOverflowMenuSelect = (app) => {
                this.setState({ isOverflowMenuOpen: false }, () => {
                        this.scrollAppIntoView(app.id);
                        this.handleAppButtonClick(app);
                });
        };

        handleDocumentPointerDown = (event) => {
                if (!this.state.isOverflowMenuOpen) return;
                const menu = this.overflowMenuRef?.current;
                const button = this.overflowButtonRef?.current;
                const target = event.target;
                if (!menu || !button) return;
                if (!menu.contains(target) && !button.contains(target)) {
                        this.setState({ isOverflowMenuOpen: false });
                }
        };

        handleOverflowKeyDown = (event) => {
                if (event.key === 'Escape') {
                        this.setState({ isOverflowMenuOpen: false });
                }
        };

        handleWindowResize = () => {
                this.scheduleOverflowUpdate();
        };

        handleTaskbarScroll = () => {
                this.scheduleOverflowUpdate();
        };

        handleTaskbarWheel = (event) => {
                const list = this.taskbarListRef.current;
                if (!list) return;
                if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
                        return;
                }
                if (typeof event.preventDefault === 'function') {
                        event.preventDefault();
                }
                const nextScroll = list.scrollLeft + event.deltaY;
                list.scrollLeft = nextScroll;
                this.scheduleOverflowUpdate();
        };

        setupResizeObserver = () => {
                if (typeof window === 'undefined' || typeof window.ResizeObserver !== 'function') return;
                if (this.resizeObserver) {
                        this.resizeObserver.disconnect();
                }
                this.resizeObserver = new window.ResizeObserver(() => {
                        this.scheduleOverflowUpdate();
                });
                const container = this.taskbarContainerRef.current;
                if (container) {
                        this.resizeObserver.observe(container);
                }
        };

        attachTaskbarListListeners = () => {
                const list = this.taskbarListRef.current;
                if (this.wheelListenerTarget && this.wheelListenerTarget !== list) {
                        this.wheelListenerTarget.removeEventListener('wheel', this.handleTaskbarWheel);
                        this.wheelListenerTarget = null;
                }
                if (list && this.wheelListenerTarget !== list) {
                        const options = { passive: false };
                        list.addEventListener('wheel', this.handleTaskbarWheel, options);
                        this.wheelListenerTarget = list;
                }
        };

        scheduleOverflowUpdate = () => {
                if (typeof window === 'undefined') return;
                if (this.overflowUpdateCancel) {
                        this.overflowUpdateCancel();
                        this.overflowUpdateCancel = null;
                }

                const raf = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : null;
                if (raf) {
                        const frame = raf(() => {
                                this.overflowUpdateCancel = null;
                                this.updateTaskbarOverflow();
                        });
                        this.overflowUpdateCancel = () => window.cancelAnimationFrame(frame);
                        return;
                }

                const timeout = window.setTimeout(() => {
                        this.overflowUpdateCancel = null;
                        this.updateTaskbarOverflow();
                }, 16);
                this.overflowUpdateCancel = () => window.clearTimeout(timeout);
        };

        updateTaskbarOverflow = () => {
                const list = this.taskbarListRef.current;
                if (!list) {
                        if (this.state.overflowAppIds.length || this.state.isOverflowMenuOpen) {
                                this.setState({ overflowAppIds: [], isOverflowMenuOpen: false });
                        }
                        return;
                }

                const items = Array.from(list.querySelectorAll('[data-app-id]'));
                if (!items.length) {
                        if (this.state.overflowAppIds.length || this.state.isOverflowMenuOpen) {
                                this.setState({ overflowAppIds: [], isOverflowMenuOpen: false });
                        }
                        return;
                }

                const viewportStart = list.scrollLeft || 0;
                const viewportEnd = viewportStart + list.clientWidth;
                const tolerance = 1;
                const overflowAppIds = [];

                items.forEach((item) => {
                        const appId = item.getAttribute('data-app-id');
                        if (!appId) return;
                        const itemLeft = item.offsetLeft;
                        const itemRight = itemLeft + item.offsetWidth;
                        const isVisible =
                                itemLeft >= viewportStart - tolerance && itemRight <= viewportEnd + tolerance;
                        if (!isVisible) {
                                overflowAppIds.push(appId);
                        }
                });

                const hasOverflow = list.scrollWidth > list.clientWidth + 1;
                const normalizedOverflow = hasOverflow ? overflowAppIds : [];

                if (!areArraysEqual(normalizedOverflow, this.state.overflowAppIds)) {
                        this.setState((prevState) => ({
                                overflowAppIds: normalizedOverflow,
                                isOverflowMenuOpen:
                                        normalizedOverflow.length === 0 ? false : prevState.isOverflowMenuOpen
                        }));
                } else if (!hasOverflow && this.state.isOverflowMenuOpen) {
                        this.setState({ isOverflowMenuOpen: false });
                }
        };

        scrollAppIntoView = (appId) => {
                const list = this.taskbarListRef.current;
                if (!list) return;
                const escape = typeof window !== 'undefined' && window.CSS && typeof window.CSS.escape === 'function'
                        ? window.CSS.escape(appId)
                        : appId.replace(/"/g, '\\"');
                const target = list.querySelector(`[data-app-id="${escape}"]`);
                if (target && typeof target.scrollIntoView === 'function') {
                        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                }
        };

        getAppButtonRef = (appId) => {
                if (!this.appRefHandlers.has(appId)) {
                        this.appRefHandlers.set(appId, (_node) => {
                                this.scheduleOverflowUpdate();
                        });
                }
                return this.appRefHandlers.get(appId);
        };

        handleWorkspaceSelect = (workspaceId) => {
                if (typeof workspaceId !== 'number') return;
                this.setState({ activeWorkspace: workspaceId });
                if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('workspace-select', { detail: { workspaceId } }));
                }
        };

        handleStatusToggle = () => {
                this.setState((state) => ({ status_card: !state.status_card }));
        };

        handleStatusKeyDown = (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.handleStatusToggle();
                }
        };

                render() {
                        const { workspaces, activeWorkspace } = this.state;
                        return (
                                <div
                                        className="main-navbar-vp fixed inset-x-0 top-0 z-[260] flex w-full items-center justify-between bg-slate-950/80 text-ubt-grey shadow-lg backdrop-blur-md"
                                style={{
                                                minHeight: `calc(${NAVBAR_HEIGHT}px + var(--safe-area-top, 0px))`,
                                                paddingTop: `calc(var(--safe-area-top, 0px) + 0.375rem)`,
                                                paddingBottom: '0.25rem',
                                                paddingLeft: `calc(0.75rem + var(--safe-area-left, 0px))`,
                                                paddingRight: `calc(0.75rem + var(--safe-area-right, 0px))`,
                                                '--desktop-navbar-height': `calc(${NAVBAR_HEIGHT}px + var(--safe-area-top, 0px) + 0.375rem + 0.25rem)`
                                        }}
                                >
                                        <div className="flex items-center gap-2 text-xs md:text-sm">
                                                <WhiskerMenu />
                                                {workspaces.length > 0 && (
                                                        <WorkspaceSwitcher
                                                                workspaces={workspaces}
                                                                activeWorkspace={activeWorkspace}
                                                                onSelect={this.handleWorkspaceSelect}
                                                        />
                                                )}
                                                {this.renderRunningApps()}
                                                <PerformanceGraph />
                                        </div>
                                        <div className="flex items-center gap-4 text-xs md:text-sm">
                                                <Clock onlyTime={true} showCalendar={true} hour12={false} variant="minimal" />
                                                <div
                                                        id="status-bar"
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label="System status"
                                                        aria-expanded={this.state.status_card}
                                                        onClick={this.handleStatusToggle}
                                                        onKeyDown={this.handleStatusKeyDown}
                                                        className={
                                                                'relative rounded-full border border-transparent px-3 py-1 text-xs font-medium text-white/80 transition duration-150 ease-in-out hover:border-white/20 hover:bg-white/10 focus:border-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
                                                        }
                                                >
                                                        <Status />
                                                        <QuickSettings open={this.state.status_card} />
                                                </div>
                                        </div>
                                </div>
			);
		}


}
