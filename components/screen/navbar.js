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
                        hasOverflow: false,
                        overflowOpen: false
                };
                this.taskbarListRef = React.createRef();
                this.overflowButtonRef = React.createRef();
                this.overflowPanelRef = React.createRef();
                this.resizeObserver = null;
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.currentOverflowFocusIndex = 0;
                this.overflowItemRefs = [];
        }

        componentDidMount() {
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.addEventListener('resize', this.updateOverflowState);
                        window.addEventListener('mousedown', this.handleGlobalPointerDown, true);
                        window.addEventListener('touchstart', this.handleGlobalPointerDown, true);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                }
                this.updateOverflowState();
        }

        componentWillUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.removeEventListener('resize', this.updateOverflowState);
                        window.removeEventListener('mousedown', this.handleGlobalPointerDown, true);
                        window.removeEventListener('touchstart', this.handleGlobalPointerDown, true);
                }
                if (this.resizeObserver) {
                        this.resizeObserver.disconnect();
                        this.resizeObserver = null;
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
                                overflowOpen: runningAppsChanged ? false : previousState.overflowOpen
                        };
                }, this.updateOverflowState);
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
                const { runningApps, hasOverflow } = this.state;
                if (!runningApps.length) return null;

                this.overflowItemRefs = [];

                return (
                        <div className="flex items-center gap-2">
                                <ul
                                        ref={this.setTaskbarListRef}
                                        className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                        role="list"
                                        aria-label="Open applications"
                                        onDragOver={this.handleTaskbarDragOver}
                                        onDrop={this.handleTaskbarDrop}
                                >
                                        {runningApps.map((app) => this.renderRunningAppItem(app))}
                                </ul>
                                {hasOverflow && this.renderOverflowControl(runningApps)}
                        </div>
                );
        };

        setTaskbarListRef = (node) => {
                if (!node && this.resizeObserver) {
                        this.resizeObserver.disconnect();
                        this.resizeObserver = null;
                }

                this.taskbarListRef.current = node;

                if (node && typeof ResizeObserver !== 'undefined') {
                        if (!this.resizeObserver) {
                                this.resizeObserver = new ResizeObserver(() => {
                                        this.updateOverflowState();
                                });
                        }
                        this.resizeObserver.observe(node);
                }

                this.updateOverflowState();
        };

        renderRunningAppItem = (app) => (
                <li
                        key={app.id}
                        className="flex"
                        draggable
                        data-app-id={app.id}
                        role="listitem"
                        onDragStart={(event) => this.handleAppDragStart(event, app)}
                        onDragOver={this.handleAppDragOver}
                        onDrop={(event) => this.handleAppDrop(event, app.id)}
                        onDragEnd={this.handleAppDragEnd}
                >
                        {this.renderRunningAppButton(app)}
                </li>
        );

        renderRunningAppButton = (app) => {
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

        renderOverflowControl = (runningApps) => {
                const { overflowOpen } = this.state;

                return (
                        <div className="relative flex-shrink-0">
                                <button
                                        type="button"
                                        ref={this.overflowButtonRef}
                                        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-[#1b2231]/90 text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]"
                                        aria-haspopup="true"
                                        aria-expanded={overflowOpen}
                                        aria-controls="running-apps-overflow-menu"
                                        onClick={this.handleOverflowToggle}
                                        onKeyDown={this.handleOverflowButtonKeyDown}
                                >
                                        <span className="sr-only">Show hidden applications</span>
                                        <span aria-hidden="true" className="text-lg leading-none">⋯</span>
                                </button>
                                {overflowOpen && (
                                        <div
                                                id="running-apps-overflow-menu"
                                                ref={this.overflowPanelRef}
                                                role="menu"
                                                aria-label="Hidden applications"
                                                className="absolute right-0 top-full z-[300] mt-2 max-h-60 min-w-[12rem] overflow-y-auto rounded-md border border-white/10 bg-[#101623]/95 p-1 shadow-xl focus:outline-none"
                                                onKeyDown={this.handleOverflowMenuKeyDown}
                                        >
                                                <ul role="none" className="flex flex-col gap-1">
                                                        {runningApps.map((app, index) => this.renderOverflowMenuItem(app, index))}
                                                </ul>
                                        </div>
                                )}
                        </div>
                );
        };

        renderOverflowMenuItem = (app, index) => {
                const isActive = !app.isMinimized;
                const isFocused = app.isFocused && isActive;

                return (
                        <li key={`${app.id}-overflow`} role="none">
                                <button
                                        type="button"
                                        role="menuitem"
                                        tabIndex={-1}
                                        ref={(node) => {
                                                this.overflowItemRefs[index] = node;
                                        }}
                                        className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                                        data-app-id={app.id}
                                        onClick={() => this.handleOverflowItemSelect(app)}
                                >
                                        <span className="relative inline-flex items-center justify-center">
                                                <Image
                                                        src={app.icon}
                                                        alt=""
                                                        width={28}
                                                        height={28}
                                                        className="h-7 w-7"
                                                />
                                                {isActive && (
                                                        <span
                                                                aria-hidden="true"
                                                                className="absolute -bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-current"
                                                        />
                                                )}
                                        </span>
                                        <span className="flex-1 truncate">{app.title}</span>
                                </button>
                        </li>
                );
        };

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
                        this.updateOverflowState();
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


        updateOverflowState = () => {
                if (!this.taskbarListRef.current) {
                        if (this.state.hasOverflow || this.state.overflowOpen) {
                                this.setState({ hasOverflow: false, overflowOpen: false });
                        }
                        return;
                }

                const { clientWidth, scrollWidth } = this.taskbarListRef.current;
                const hasOverflow = scrollWidth > clientWidth + 1;

                if (hasOverflow !== this.state.hasOverflow) {
                        this.setState((prevState) => ({
                                hasOverflow,
                                overflowOpen: hasOverflow ? prevState.overflowOpen : false
                        }));
                } else if (!hasOverflow && this.state.overflowOpen) {
                        this.setState({ overflowOpen: false });
                }
        };

        handleOverflowToggle = () => {
                if (this.state.overflowOpen) {
                        this.closeOverflowMenu(true);
                        return;
                }
                this.openOverflowMenu();
        };

        openOverflowMenu = () => {
                if (!this.state.hasOverflow) return;
                this.setState({ overflowOpen: true }, () => {
                        this.focusOverflowItem(0);
                });
        };

        closeOverflowMenu = (focusTrigger = false) => {
                if (!this.state.overflowOpen) return;
                this.setState({ overflowOpen: false }, () => {
                        this.currentOverflowFocusIndex = 0;
                        if (focusTrigger && this.overflowButtonRef.current) {
                                this.overflowButtonRef.current.focus();
                        }
                });
        };

        handleOverflowButtonKeyDown = (event) => {
                if ((event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') && !this.state.overflowOpen) {
                        event.preventDefault();
                        this.openOverflowMenu();
                } else if (event.key === 'Escape' && this.state.overflowOpen) {
                        event.preventDefault();
                        this.closeOverflowMenu(true);
                }
        };

        handleOverflowMenuKeyDown = (event) => {
                if (!this.state.overflowOpen) return;

                const lastIndex = this.overflowItemRefs.length - 1;
                if (lastIndex < 0) return;

                switch (event.key) {
                        case 'ArrowDown':
                                event.preventDefault();
                                this.focusOverflowItem(Math.min(lastIndex, this.currentOverflowFocusIndex + 1));
                                break;
                        case 'ArrowUp':
                                event.preventDefault();
                                this.focusOverflowItem(Math.max(0, this.currentOverflowFocusIndex - 1));
                                break;
                        case 'Home':
                                event.preventDefault();
                                this.focusOverflowItem(0);
                                break;
                        case 'End':
                                event.preventDefault();
                                this.focusOverflowItem(lastIndex);
                                break;
                        case 'Escape':
                                event.preventDefault();
                                this.closeOverflowMenu(true);
                                break;
                        case 'Tab':
                                this.closeOverflowMenu(false);
                                break;
                        default:
                                break;
                }
        };

        handleOverflowItemSelect = (app) => {
                this.handleAppButtonClick(app);
                this.closeOverflowMenu(true);
        };

        focusOverflowItem = (index) => {
                if (!Array.isArray(this.overflowItemRefs) || !this.overflowItemRefs.length) return;
                let nextIndex = index;
                if (nextIndex < 0) nextIndex = 0;
                if (nextIndex >= this.overflowItemRefs.length) nextIndex = this.overflowItemRefs.length - 1;
                const target = this.overflowItemRefs[nextIndex];
                if (target && typeof target.focus === 'function') {
                        this.currentOverflowFocusIndex = nextIndex;
                        target.focus();
                }
        };

        handleGlobalPointerDown = (event) => {
                if (!this.state.overflowOpen) return;
                const button = this.overflowButtonRef.current;
                const panel = this.overflowPanelRef.current;
                if (button && button.contains(event.target)) return;
                if (panel && panel.contains(event.target)) return;
                this.closeOverflowMenu(false);
        };

}
