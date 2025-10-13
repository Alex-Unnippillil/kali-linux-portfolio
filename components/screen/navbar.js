import React, { PureComponent } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { NAVBAR_HEIGHT } from '../../utils/uiConstants';

const MOBILE_ACTION_BAR_HEIGHT = 64;

const OVERLAY_IDS = Object.freeze({
        launcher: 'overlay-launcher',
        commandPalette: 'overlay-command-palette',
        windowSwitcher: 'overlay-window-switcher'
});

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
                        isMobile: false
                };
                this.taskbarListRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.mobileMediaQuery = null;
        }

        componentDidMount() {
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                        this.mobileMediaQuery = window.matchMedia('(max-width: 767px)');
                        if (this.mobileMediaQuery) {
                                this.setState({ isMobile: this.mobileMediaQuery.matches });
                                if (typeof this.mobileMediaQuery.addEventListener === 'function') {
                                        this.mobileMediaQuery.addEventListener('change', this.handleMobileViewportChange);
                                } else if (typeof this.mobileMediaQuery.addListener === 'function') {
                                        this.mobileMediaQuery.addListener(this.handleMobileViewportChange);
                                }
                        }
                }
        }

        componentWillUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        if (this.mobileMediaQuery) {
                                if (typeof this.mobileMediaQuery.removeEventListener === 'function') {
                                        this.mobileMediaQuery.removeEventListener('change', this.handleMobileViewportChange);
                                } else if (typeof this.mobileMediaQuery.removeListener === 'function') {
                                        this.mobileMediaQuery.removeListener(this.handleMobileViewportChange);
                                }
                                this.mobileMediaQuery = null;
                        }
                }
        }

        handleMobileViewportChange = (event) => {
                const matches = Boolean(event?.matches);
                this.setState((previous) => ({
                        isMobile: matches,
                        status_card: matches ? previous.status_card : false
                }));
        };

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
                                runningApps: runningAppsChanged ? nextRunningApps : previousState.runningApps
                        };
                });
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

        handleOverlayToggle = (appId) => {
                if (!appId) return;
                this.setState({ status_card: false });
                this.dispatchTaskbarCommand({ appId, action: 'toggle' });
        };

        handleLauncherToggle = () => {
                this.handleOverlayToggle(OVERLAY_IDS.launcher);
        };

        handleCommandPaletteToggle = () => {
                this.handleOverlayToggle(OVERLAY_IDS.commandPalette);
        };

        handleWindowSwitcherToggle = () => {
                this.handleOverlayToggle(OVERLAY_IDS.windowSwitcher);
        };

        renderRunningApps = () => {
                const { runningApps } = this.state;
                if (!runningApps.length) return null;

                return (
                        <ul
                                ref={this.taskbarListRef}
                                className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                role="list"
                                aria-label="Open applications"
                                onDragOver={this.handleTaskbarDragOver}
                                onDrop={this.handleTaskbarDrop}
                        >
                                {runningApps.map((app) => this.renderRunningAppItem(app))}
                        </ul>
                );
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

        renderMobileActionButton = ({ id, label, icon, onClick }) => (
                <button
                        key={id}
                        type="button"
                        className="group flex flex-1 flex-col items-center gap-1 rounded-xl border border-transparent bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                        onClick={onClick}
                        aria-label={label}
                >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                                <Image src={icon} alt="" width={28} height={28} className="h-6 w-6 opacity-90" />
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
                                {label}
                        </span>
                </button>
        );

        renderMobileActionBar = () => {
                const { isMobile } = this.state;
                if (!isMobile) return null;

                const actions = [
                        {
                                id: 'launcher',
                                label: 'Launcher',
                                icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
                                onClick: this.handleLauncherToggle
                        },
                        {
                                id: 'search',
                                label: 'Search',
                                icon: '/themes/Yaru/apps/word-search.svg',
                                onClick: this.handleCommandPaletteToggle
                        },
                        {
                                id: 'recent',
                                label: 'Recent',
                                icon: '/themes/Yaru/window/window-restore-symbolic.svg',
                                onClick: this.handleWindowSwitcherToggle
                        }
                ];

                return (
                        <div
                                className="mobile-action-bar fixed inset-x-0 bottom-0 z-[260] flex items-end justify-center gap-3 bg-slate-950/90 px-4 pb-3 pt-2 text-ubt-grey shadow-[0_-8px_30px_rgba(8,11,20,0.7)] backdrop-blur-md md:hidden"
                                style={{
                                        paddingLeft: `calc(var(--safe-area-left, 0px) + 1rem)`,
                                        paddingRight: `calc(var(--safe-area-right, 0px) + 1rem)`,
                                        paddingBottom: `calc(var(--safe-area-bottom, 0px) + 0.75rem)`,
                                        minHeight: `calc(${MOBILE_ACTION_BAR_HEIGHT}px + var(--safe-area-bottom, 0px))`,
                                        '--shell-taskbar-height': `calc(${MOBILE_ACTION_BAR_HEIGHT}px + var(--safe-area-bottom, 0px))`
                                }}
                        >
                                <div className="flex w-full items-center gap-3">
                                        {actions.map((action) => this.renderMobileActionButton(action))}
                                        <div className="mobile-quick-settings relative flex flex-1 flex-col items-center">
                                                <button
                                                        type="button"
                                                        aria-label="Quick settings"
                                                        aria-expanded={this.state.status_card}
                                                        onClick={this.handleStatusToggle}
                                                        onKeyDown={this.handleStatusKeyDown}
                                                        className="flex w-full flex-1 flex-col items-center gap-1 rounded-xl border border-transparent bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                                >
                                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white">
                                                                <svg
                                                                        aria-hidden="true"
                                                                        viewBox="0 0 24 24"
                                                                        className="h-6 w-6 opacity-90"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="1.8"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                >
                                                                        <circle cx="12" cy="12" r="3.2" />
                                                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                                                </svg>
                                                        </span>
                                                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
                                                                Settings
                                                        </span>
                                                </button>
                                                <QuickSettings open={this.state.status_card} />
                                        </div>
                                </div>
                        </div>
                );
        };

        render() {
                const { workspaces, activeWorkspace, isMobile } = this.state;
                return (
                        <>
                                <div
                                        className="main-navbar-vp fixed inset-x-0 top-0 z-[260] hidden w-full items-center justify-between bg-slate-950/80 text-ubt-grey shadow-lg backdrop-blur-md md:flex"
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
                                                {!isMobile && (
                                                        <div
                                                                id="status-bar"
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-label="System status"
                                                                aria-expanded={this.state.status_card}
                                                                onClick={this.handleStatusToggle}
                                                                onKeyDown={this.handleStatusKeyDown}
                                                                className={
                                                                        'relative hidden rounded-full border border-transparent px-3 py-1 text-xs font-medium text-white/80 transition duration-150 ease-in-out hover:border-white/20 hover:bg-white/10 focus:border-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 md:inline-flex'
                                                                }
                                                        >
                                                                <Status />
                                                                <QuickSettings open={this.state.status_card} />
                                                        </div>
                                                )}
                                        </div>
                                </div>
                                {this.renderMobileActionBar()}
                        </>
                );
        }
}
