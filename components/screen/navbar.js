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

const resolveString = (value, fallback = '') => {
        if (typeof value !== 'string') return fallback;
        const trimmed = value.trim();
        return trimmed || fallback;
};

const getBaseAppId = (app = {}) => {
        if (typeof app.appId === 'string') {
                return app.appId;
        }
        if (typeof app.baseId === 'string') {
                return app.baseId;
        }
        if (typeof app.id === 'string') {
                const [base] = app.id.split('#');
                return base || app.id;
        }
        return null;
};

const getInstanceId = (app = {}, fallbackIndex = 0) => {
        if (typeof app.windowId === 'string') {
                return app.windowId;
        }
        if (typeof app.instanceId === 'string') {
                return app.instanceId;
        }
        if (typeof app.id === 'string') {
                return app.id;
        }
        if (typeof app.appId === 'string') {
                return `${app.appId}#${fallbackIndex + 1}`;
        }
        return null;
};

const resolveGroupTitle = (app = {}) => {
        return (
                resolveString(app.groupTitle) ||
                resolveString(app.appTitle) ||
                resolveString(app.title) ||
                getBaseAppId(app) ||
                'Application'
        );
};

const resolveInstanceTitle = (app = {}, fallback) => {
        return (
                resolveString(app.windowTitle) ||
                resolveString(app.title) ||
                fallback ||
                'Window'
        );
};

const groupRunningApps = (apps = []) => {
        if (!Array.isArray(apps) || !apps.length) {
                return [];
        }

        const order = [];
        const map = new Map();

        apps.forEach((app) => {
                const baseId = getBaseAppId(app);
                if (!baseId) {
                        return;
                }

                if (!order.includes(baseId)) {
                        order.push(baseId);
                }

                const existing = map.get(baseId);
                const group = existing || {
                        id: baseId,
                        title: resolveGroupTitle(app),
                        icon: typeof app.icon === 'string' ? app.icon : null,
                        instances: [],
                        isFocused: false,
                        hasActiveWindow: false
                };

                const instanceIndex = group.instances.length;
                const instanceTitle = resolveInstanceTitle(app, group.title);
                const instanceId = getInstanceId(app, instanceIndex) || `${baseId}#${instanceIndex + 1}`;
                const isMinimized = Boolean(app.isMinimized);
                const isFocused = Boolean(app.isFocused);

                group.instances.push({
                        id: instanceId,
                        appId: baseId,
                        title: instanceTitle,
                        icon: typeof app.icon === 'string' ? app.icon : null,
                        preview: typeof app.preview === 'string' ? app.preview : null,
                        isFocused,
                        isMinimized,
                        isOverlay: Boolean(app.isOverlay)
                });

                if (!group.icon && typeof app.icon === 'string') {
                        group.icon = app.icon;
                }

                if (isFocused && !isMinimized) {
                        group.isFocused = true;
                }

                if (!isMinimized) {
                        group.hasActiveWindow = true;
                }

                map.set(baseId, group);
        });

        return order
                .map((id) => map.get(id))
                .filter(Boolean)
                .map((group) => ({
                        ...group,
                        hasActiveWindow: group.hasActiveWindow || group.instances.some((instance) => !instance.isMinimized),
                        isFocused: group.isFocused || group.instances.some((instance) => instance.isFocused && !instance.isMinimized)
                }));
};

const areRunningAppGroupsEqual = (next = [], prev = []) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                const a = next[index];
                const b = prev[index];
                if (!b) return false;
                if (
                        a.id !== b.id ||
                        a.title !== b.title ||
                        a.icon !== b.icon ||
                        Boolean(a.isFocused) !== Boolean(b.isFocused) ||
                        Boolean(a.hasActiveWindow) !== Boolean(b.hasActiveWindow)
                ) {
                        return false;
                }
                const aInstances = Array.isArray(a.instances) ? a.instances : [];
                const bInstances = Array.isArray(b.instances) ? b.instances : [];
                if (aInstances.length !== bInstances.length) {
                        return false;
                }
                for (let instanceIndex = 0; instanceIndex < aInstances.length; instanceIndex += 1) {
                        const nextInstance = aInstances[instanceIndex];
                        const prevInstance = bInstances[instanceIndex];
                        if (!prevInstance) return false;
                        if (
                                nextInstance.id !== prevInstance.id ||
                                nextInstance.title !== prevInstance.title ||
                                nextInstance.preview !== prevInstance.preview ||
                                Boolean(nextInstance.isFocused) !== Boolean(prevInstance.isFocused) ||
                                Boolean(nextInstance.isMinimized) !== Boolean(prevInstance.isMinimized)
                        ) {
                                return false;
                        }
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
                        openGroupId: null
                };
                this.taskbarListRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.groupButtonRefs = new Map();
                this.openMenuItemRefs = [];
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
                const nextRunningAppsRaw = Array.isArray(detail.runningApps) ? detail.runningApps : [];
                const nextRunningApps = groupRunningApps(nextRunningAppsRaw);

                this.setState((previousState) => {
                        const workspacesChanged = !areWorkspacesEqual(nextWorkspaces, previousState.workspaces);
                        const activeChanged = previousState.activeWorkspace !== nextActiveWorkspace;
                        const runningAppsChanged = !areRunningAppGroupsEqual(nextRunningApps, previousState.runningApps);
                        let openGroupId = previousState.openGroupId;
                        if (runningAppsChanged && openGroupId) {
                                const stillOpen = nextRunningApps.some((group) => group.id === openGroupId);
                                if (!stillOpen) {
                                        openGroupId = null;
                                }
                        }

                        if (!workspacesChanged && !activeChanged && !runningAppsChanged) {
                                return null;
                        }

                        const partial = {
                                workspaces: workspacesChanged ? nextWorkspaces : previousState.workspaces,
                                activeWorkspace: nextActiveWorkspace
                        };

                        if (runningAppsChanged) {
                                partial.runningApps = nextRunningApps;
                        }

                        if (openGroupId !== previousState.openGroupId) {
                                partial.openGroupId = openGroupId;
                        }

                        return partial;
                });
        };

        dispatchTaskbarCommand = (detail) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
        };

        handleAppButtonClick = (app) => {
                if (!app) return;
                const appId = typeof app.appId === 'string' ? app.appId : app.id;
                if (!appId) return;
                const detail = { appId, action: 'toggle' };
                const windowId = typeof app.windowId === 'string' ? app.windowId : null;
                if (windowId && windowId !== appId) {
                        detail.windowId = windowId;
                }
                this.dispatchTaskbarCommand(detail);
        };

        handleAppButtonKeyDown = (event, app) => {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.handleAppButtonClick(app);
                }
        };

        registerGroupButtonRef = (groupId, node) => {
                if (!groupId) return;
                if (!node) {
                        this.groupButtonRefs.delete(groupId);
                        return;
                }
                this.groupButtonRefs.set(groupId, node);
        };

        focusGroupButton = (groupId) => {
                const node = this.groupButtonRefs.get(groupId);
                if (node && typeof node.focus === 'function') {
                        node.focus();
                }
        };

        focusGroupMenuItem = (index) => {
                if (index === null || index === undefined) return;
                const target = this.openMenuItemRefs?.[index];
                if (target && typeof target.focus === 'function') {
                        target.focus();
                }
        };

        openGroupMenu = (groupId, focusIndex = null) => {
                if (!groupId) return;
                if (this.state.openGroupId === groupId) {
                        if (focusIndex !== null) {
                                setTimeout(() => this.focusGroupMenuItem(focusIndex), 0);
                        }
                        return;
                }
                this.setState({ openGroupId: groupId }, () => {
                        if (focusIndex !== null) {
                                setTimeout(() => this.focusGroupMenuItem(focusIndex), 0);
                        }
                });
        };

        closeGroupMenu = (callback) => {
                if (!this.state.openGroupId) {
                        if (typeof callback === 'function') {
                                callback();
                        }
                        return;
                }
                this.setState({ openGroupId: null }, () => {
                        this.openMenuItemRefs = [];
                        if (typeof callback === 'function') {
                                callback();
                        }
                });
        };

        handleGroupButtonKeyDown = (event, group) => {
                if (!group) return;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        const focusIndex = event.key === 'ArrowDown' ? 0 : (group.instances.length - 1);
                        this.openGroupMenu(group.id, focusIndex);
                        return;
                }
                this.handleAppButtonKeyDown(event, group);
        };

        handleGroupMenuItemKeyDown = (event, group, index) => {
                if (!group) return;
                if (event.key === 'Escape') {
                        event.preventDefault();
                        this.closeGroupMenu(() => this.focusGroupButton(group.id));
                        return;
                }
                if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        const nextIndex = (index + 1) % group.instances.length;
                        this.focusGroupMenuItem(nextIndex);
                        return;
                }
                if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        const prevIndex = (index - 1 + group.instances.length) % group.instances.length;
                        this.focusGroupMenuItem(prevIndex);
                        return;
                }
                if (event.key === 'Home') {
                        event.preventDefault();
                        this.focusGroupMenuItem(0);
                        return;
                }
                if (event.key === 'End') {
                        event.preventDefault();
                        this.focusGroupMenuItem(group.instances.length - 1);
                }
        };

        handleGroupInstanceSelect = (group, instance) => {
                if (!group || !instance) return;
                const detail = {
                        appId: instance.appId || group.id,
                        action: 'focus'
                };
                if (instance.id && instance.id !== detail.appId) {
                        detail.windowId = instance.id;
                }
                this.dispatchTaskbarCommand(detail);
                this.closeGroupMenu();
        };

        handleGroupContainerBlur = (event, groupId) => {
                const { relatedTarget } = event;
                if (event.currentTarget.contains(relatedTarget)) {
                        return;
                }
                if (this.state.openGroupId === groupId) {
                        this.closeGroupMenu();
                }
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

        renderRunningAppItem = (group) => {
                const hasMultiple = Array.isArray(group.instances) && group.instances.length > 1;
                const isOpen = this.state.openGroupId === group.id;
                const content = hasMultiple ? (
                        <div
                                className="relative flex"
                                onMouseEnter={() => this.openGroupMenu(group.id)}
                                onMouseLeave={() => this.closeGroupMenu()}
                                onBlurCapture={(event) => this.handleGroupContainerBlur(event, group.id)}
                        >
                                {this.renderRunningAppButton(group, { isGroup: true, isOpen })}
                                {isOpen ? this.renderGroupMenu(group) : null}
                        </div>
                ) : (
                        this.renderRunningAppButton(group, { instance: group.instances?.[0] })
                );

                return (
                        <li
                                key={group.id}
                                className="flex"
                                draggable
                                data-app-id={group.id}
                                role="listitem"
                                onDragStart={(event) => this.handleAppDragStart(event, group)}
                                onDragOver={this.handleAppDragOver}
                                onDrop={(event) => this.handleAppDrop(event, group.id)}
                                onDragEnd={this.handleAppDragEnd}
                        >
                                {content}
                        </li>
                );
        };

        renderRunningAppButton = (group, options = {}) => {
                const { instance = null, isGroup = false, isOpen = false } = options;
                const label = resolveString(group.title) || resolveString(instance?.title) || group.id;
                const icon = group.icon || instance?.icon;
                const hasInstances = Array.isArray(group.instances) && group.instances.length > 0;
                const activeWindows = hasInstances ? group.instances.filter((item) => !item.isMinimized) : [];
                const isActive = hasInstances ? activeWindows.length > 0 : !group.isMinimized;
                const focusedWindows = hasInstances
                        ? group.instances.filter((item) => item.isFocused && !item.isMinimized)
                        : [];
                const isFocused = focusedWindows.length > 0;

                return (
                        <button
                                type="button"
                                ref={isGroup ? (node) => this.registerGroupButtonRef(group.id, node) : undefined}
                                aria-label={label}
                                aria-pressed={isActive}
                                data-context="taskbar"
                                data-app-id={group.id}
                                data-active={isActive ? 'true' : 'false'}
                                data-has-multiple={isGroup ? 'true' : 'false'}
                                onClick={() => this.handleAppButtonClick(group)}
                                onKeyDown={isGroup
                                        ? (event) => this.handleGroupButtonKeyDown(event, group)
                                        : (event) => this.handleAppButtonKeyDown(event, group)}
                                className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} relative flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                                {...(isGroup
                                        ? {
                                                'aria-haspopup': 'menu',
                                                'aria-expanded': isOpen ? 'true' : 'false'
                                        }
                                        : {})}
                        >
                                <span className="relative inline-flex items-center justify-center">
                                        {icon ? (
                                                <Image
                                                        src={icon}
                                                        alt=""
                                                        width={28}
                                                        height={28}
                                                        className="h-6 w-6"
                                                />
                                        ) : (
                                                <span className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-[10px] uppercase">
                                                        {(label || group.id || '?').slice(0, 2)}
                                                </span>
                                        )}
                                        {isActive && (
                                                <span
                                                        aria-hidden="true"
                                                        data-testid="running-indicator"
                                                        className={`absolute -bottom-1 left-1/2 h-1 rounded-full bg-current ${isGroup ? 'w-4 -translate-x-1/2' : 'w-2 -translate-x-1/2'}`}
                                                />
                                        )}
                                        {isGroup && group.instances.length > 1 && (
                                                <span
                                                        className="absolute -top-1 -right-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--kali-blue)] px-1 text-[10px] font-semibold text-white"
                                                >
                                                        {group.instances.length}
                                                </span>
                                        )}
                                </span>
                                <span className="hidden whitespace-nowrap text-white md:inline">{label}</span>
                        </button>
                );
        };

        renderGroupMenu = (group) => {
                this.openMenuItemRefs = [];
                const title = resolveString(group.title) || group.id;
                return (
                        <div
                                className="pointer-events-auto absolute left-0 top-full z-[300] mt-2 w-64 max-w-xs rounded-lg border border-white/10 bg-slate-950/95 p-2 text-white shadow-xl backdrop-blur"
                                role="menu"
                                aria-label={`${title} windows`}
                        >
                                <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                                        {title}
                                </div>
                                <div className="flex flex-col gap-2">
                                        {group.instances.map((instance, index) => this.renderGroupMenuItem(group, instance, index))}
                                </div>
                        </div>
                );
        };

        renderGroupMenuItem = (group, instance, index) => {
                const preview = instance.preview;
                const statusLabel = instance.isMinimized
                        ? 'Minimized'
                        : instance.isFocused
                                ? 'Focused'
                                : 'Active';
                const statusClass = instance.isMinimized
                        ? 'text-white/50'
                        : instance.isFocused
                                ? 'text-[var(--kali-blue)]'
                                : 'text-white/70';

                return (
                        <button
                                key={instance.id || `${group.id}-${index}`}
                                type="button"
                                role="menuitem"
                                ref={(node) => {
                                        if (this.state.openGroupId === group.id) {
                                                this.openMenuItemRefs[index] = node;
                                        }
                                }}
                                onClick={() => this.handleGroupInstanceSelect(group, instance)}
                                onKeyDown={(event) => this.handleGroupMenuItemKeyDown(event, group, index)}
                                className="flex flex-col gap-2 rounded-md border border-transparent bg-white/5 p-2 text-left text-xs text-white/80 transition hover:border-white/20 hover:bg-white/10 focus:border-[var(--kali-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]"
                        >
                                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-slate-900">
                                        {preview ? (
                                                <img
                                                        src={preview}
                                                        alt={`${instance.title} preview`}
                                                        className="h-full w-full object-cover"
                                                />
                                        ) : (
                                                <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-wide text-white/40">
                                                        No preview
                                                </div>
                                        )}
                                        {instance.isFocused && !instance.isMinimized && (
                                                <span className="absolute inset-1 rounded border border-[var(--kali-blue)]/70" aria-hidden="true" />
                                        )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                        <span className="truncate font-medium text-white/90">{instance.title}</span>
                                        <span className={`shrink-0 text-[10px] uppercase tracking-wide ${statusClass}`}>{statusLabel}</span>
                                </div>
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
