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

const arePinnedAppsEqual = (next = [], prev = []) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                const a = next[index];
                const b = prev[index];
                if (!b) return false;
                if (
                        a.id !== b.id ||
                        a.title !== b.title ||
                        a.icon !== b.icon ||
                        a.isRunning !== b.isRunning ||
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
                        pinnedApps: [],
                };
                this.taskbarListRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.pendingPinnedReorder = null;
                this.draggingSection = null;
        }

        componentDidMount() {
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                }
        }

        componentWillUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                }
        }

        handleWorkspaceStateUpdate = (event) => {
                const detail = event?.detail || {};
                const { workspaces, activeWorkspace } = detail;
                const nextWorkspaces = Array.isArray(workspaces) ? workspaces : [];
                const nextActiveWorkspace = typeof activeWorkspace === 'number' ? activeWorkspace : 0;
                const nextRunningApps = Array.isArray(detail.runningApps) ? detail.runningApps : [];
                const nextPinnedApps = Array.isArray(detail.pinnedApps) ? detail.pinnedApps : [];

                this.setState((previousState) => {
                        const workspacesChanged = !areWorkspacesEqual(nextWorkspaces, previousState.workspaces);
                        const activeChanged = previousState.activeWorkspace !== nextActiveWorkspace;
                        const runningAppsChanged = !areRunningAppsEqual(nextRunningApps, previousState.runningApps);
                        const pinnedAppsChanged = !arePinnedAppsEqual(nextPinnedApps, previousState.pinnedApps);

                        if (!workspacesChanged && !activeChanged && !runningAppsChanged && !pinnedAppsChanged) {
                                return null;
                        }

                        return {
                                workspaces: workspacesChanged ? nextWorkspaces : previousState.workspaces,
                                activeWorkspace: nextActiveWorkspace,
                                runningApps: runningAppsChanged ? nextRunningApps : previousState.runningApps,
                                pinnedApps: pinnedAppsChanged ? nextPinnedApps : previousState.pinnedApps,
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

        renderRunningApps = () => {
                const { runningApps, pinnedApps } = this.state;
                if (!runningApps.length) return null;

                const pinnedIds = new Set((pinnedApps || []).map((item) => item.id));
                const visibleApps = runningApps.filter((app) => !pinnedIds.has(app.id));
                if (!visibleApps.length) return null;

                return (
                        <ul
                                ref={this.taskbarListRef}
                                className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                role="list"
                                aria-label="Open applications"
                                onDragOver={this.handleTaskbarDragOver}
                                onDrop={this.handleTaskbarDrop}
                        >
                                {visibleApps.map((app) => this.renderRunningAppItem(app))}
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
                        {this.renderTaskbarButton(app, 'running')}
                </li>
        );

        renderPinnedApps = () => {
                const { pinnedApps = [] } = this.state;
                const hasItems = pinnedApps.length > 0;

                return (
                        <ul
                                className="flex min-h-[2.5rem] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                role="list"
                                aria-label="Pinned applications"
                                onDragOver={this.handlePinnedDragOver}
                                onDrop={this.handlePinnedContainerDrop}
                        >
                                {hasItems
                                        ? pinnedApps.map((app) => this.renderPinnedAppItem(app))
                                        : (
                                                <li className="pointer-events-none select-none px-2 text-xs text-white/40">
                                                        Drag apps here to pin
                                                </li>
                                        )}
                        </ul>
                );
        };

        renderPinnedAppItem = (app) => (
                <li
                        key={app.id}
                        className="flex"
                        draggable
                        data-app-id={app.id}
                        role="listitem"
                        onDragStart={(event) => this.handlePinnedDragStart(event, app)}
                        onDragOver={this.handlePinnedDragOver}
                        onDrop={(event) => this.handlePinnedDrop(event, app.id)}
                        onDragEnd={this.handlePinnedDragEnd}
                >
                        {this.renderTaskbarButton(app, 'pinned')}
                </li>
        );

        renderTaskbarButton = (app, section) => {
                const isMinimized = Boolean(app.isMinimized);
                const isRunning = section === 'running' ? true : Boolean(app.isRunning);
                const isActive = section === 'running' ? !isMinimized : (isRunning && !isMinimized);
                const isFocused = section === 'running'
                        ? Boolean(app.isFocused && isActive)
                        : Boolean(app.isFocused && isActive);

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
                const source = this.getDragSource(event);
                if (!source.id) return;
                if (source.section === 'pinned') {
                        this.dispatchTaskbarCommand({ action: 'unpin', appId: source.id });
                        return;
                }
                this.reorderRunningApps(source.id, null, true);
        };

        handleAppDragStart = (event, app) => {
                this.draggingAppId = app.id;
                this.draggingSection = 'running';
                if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('application/x-taskbar-app-id', `running|${app.id}`);
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
                const source = this.getDragSource(event);
                if (!source.id) return;
                if (source.section === 'pinned') {
                        this.dispatchTaskbarCommand({ action: 'unpin', appId: source.id });
                        return;
                }
                const rect = event.currentTarget?.getBoundingClientRect?.();
                const insertAfter = rect ? (event.clientX - rect.left) > rect.width / 2 : false;
                this.reorderRunningApps(source.id, targetId, insertAfter);
        };

        handleAppDragEnd = () => {
                this.draggingAppId = null;
                this.draggingSection = null;
        };

        handlePinnedDragStart = (event, app) => {
                this.draggingAppId = app.id;
                this.draggingSection = 'pinned';
                if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('application/x-taskbar-app-id', `pinned|${app.id}`);
                }
        };

        handlePinnedDragOver = (event) => {
                event.preventDefault();
                if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'move';
                }
        };

        handlePinnedDrop = (event, targetId) => {
                event.preventDefault();
                const source = this.getDragSource(event);
                if (!source.id) return;
                const rect = event.currentTarget?.getBoundingClientRect?.();
                const insertAfter = rect ? (event.clientX - rect.left) > rect.width / 2 : false;
                if (source.section === 'running') {
                        this.pinAppFromDrag(source.id, targetId, insertAfter);
                        return;
                }
                this.reorderPinnedApps(source.id, targetId, insertAfter);
        };

        handlePinnedContainerDrop = (event) => {
                event.preventDefault();
                const source = this.getDragSource(event);
                if (!source.id) return;
                if (source.section === 'running') {
                        this.pinAppFromDrag(source.id, null, true);
                        return;
                }
                this.reorderPinnedApps(source.id, null, true);
        };

        handlePinnedDragEnd = () => {
                this.draggingAppId = null;
                this.draggingSection = null;
        };

        getDragSource = (event) => {
                const transfer = event.dataTransfer;
                if (transfer) {
                        const explicit = transfer.getData('application/x-taskbar-app-id');
                        if (explicit) {
                                if (explicit.includes('|')) {
                                        const [section, id] = explicit.split('|');
                                        return { id, section };
                                }
                                return { id: explicit, section: 'running' };
                        }
                }
                if (this.draggingAppId) {
                        return { id: this.draggingAppId, section: this.draggingSection || 'running' };
                }
                return { id: null, section: null };
        };

        pinAppFromDrag = (sourceId, targetId, insertAfter = false) => {
                const detail = {
                        action: 'pin',
                        appId: sourceId,
                };
                if (targetId) {
                        detail.targetId = targetId;
                }
                if (insertAfter) {
                        detail.insertAfter = true;
                }
                this.dispatchTaskbarCommand(detail);
        };

        reorderPinnedApps = (sourceId, targetId, insertAfter = false) => {
                if (!sourceId) return;
                this.pendingPinnedReorder = null;
                this.setState((prevState) => {
                        const updated = this.computeReorderedApps(prevState.pinnedApps, sourceId, targetId, insertAfter);
                        if (!updated) return null;
                        this.pendingPinnedReorder = updated.map((item) => item.id);
                        return { pinnedApps: updated };
                }, () => {
                        if (this.pendingPinnedReorder) {
                                this.dispatchTaskbarCommand({ action: 'reorderPinned', order: this.pendingPinnedReorder });
                                this.pendingPinnedReorder = null;
                        }
                });
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

                render() {
                        const { workspaces, activeWorkspace } = this.state;
                        const pinnedApps = this.renderPinnedApps();
                        const runningApps = this.renderRunningApps();
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
                                                {pinnedApps}
                                                {runningApps}
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
