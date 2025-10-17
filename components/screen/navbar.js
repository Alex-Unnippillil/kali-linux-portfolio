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
                const a = next[index] || {};
                const b = prev[index] || {};
                if (!b) return false;
                if ((a && a.id) !== (b && b.id)) return false;
                if ((a && a.windowId) !== (b && b.windowId)) return false;
                if ((a && a.instanceId) !== (b && b.instanceId)) return false;
                if ((a && a.title) !== (b && b.title)) return false;
                if ((a && a.icon) !== (b && b.icon)) return false;
                if ((a && a.workspaceId) !== (b && b.workspaceId)) return false;
                if (Boolean(a && a.isFocused) !== Boolean(b && b.isFocused)) return false;
                if (Boolean(a && a.isMinimized) !== Boolean(b && b.isMinimized)) return false;
                if (Boolean(a && a.isOverlay) !== Boolean(b && b.isOverlay)) return false;
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
                        activeAppFlyout: null,
                        activeFlyoutIndex: null
                };
                this.taskbarListRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.groupRefs = new Map();
                this.flyoutListenerAttached = false;
                this.pendingFlyoutId = null;
                this.pendingFlyoutIndex = null;
                this.activeFlyoutIndex = 0;
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
                this.detachFlyoutListeners();
        }

        componentDidUpdate(prevProps, prevState) {
                if (
                        this.state.runningApps !== prevState.runningApps ||
                        this.state.activeAppFlyout !== prevState.activeAppFlyout
                ) {
                        const { activeAppFlyout } = this.state;
                        if (!activeAppFlyout) {
                                return;
                        }
                        const { groups } = this.groupRunningApps();
                        const group = groups.find((item) => item.id === activeAppFlyout);
                        if (!group || !Array.isArray(group.instances) || group.instances.length === 0) {
                                this.closeGroupFlyout();
                                return;
                        }
                        if (typeof this.state.activeFlyoutIndex === 'number') {
                                const maxIndex = group.instances.length - 1;
                                const safeIndex = Math.min(Math.max(this.state.activeFlyoutIndex, 0), maxIndex);
                                if (safeIndex !== this.state.activeFlyoutIndex) {
                                        this.setState({ activeFlyoutIndex: safeIndex });
                                }
                        }
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

        groupRunningApps = (apps = this.state.runningApps) => {
                const groups = [];
                const map = new Map();
                if (!Array.isArray(apps)) {
                        return { groups, map };
                }
                apps.forEach((item, index) => {
                        if (!item || typeof item.id !== 'string') return;
                        const groupId = item.id;
                        let group = map.get(groupId);
                        if (!group) {
                                group = {
                                        id: groupId,
                                        title: item.title || groupId,
                                        icon: item.icon,
                                        instances: [],
                                        isOverlay: Boolean(item.isOverlay),
                                        isFocused: false,
                                        isActive: false
                                };
                                map.set(groupId, group);
                                groups.push(group);
                        }
                        const instanceData = {
                                original: item,
                                windowId: typeof item.windowId === 'string'
                                        ? item.windowId
                                        : (typeof item.instanceId === 'string' ? item.instanceId : undefined),
                                title: item.title,
                                icon: item.icon,
                                isFocused: Boolean(item.isFocused),
                                isMinimized: Boolean(item.isMinimized),
                                index
                        };
                        group.instances.push(instanceData);
                        if (!group.icon && instanceData.icon) {
                                group.icon = instanceData.icon;
                        }
                        if (!group.title && instanceData.title) {
                                group.title = instanceData.title;
                        }
                        if (instanceData.isFocused && !instanceData.isMinimized) {
                                group.isFocused = true;
                        }
                        if (!instanceData.isMinimized) {
                                group.isActive = true;
                        }
                });
                return { groups, map };
        };

        getGroupedAppOrder = (apps) => {
                if (!Array.isArray(apps)) return [];
                const seen = new Set();
                const order = [];
                apps.forEach((item) => {
                        const id = item && item.id;
                        if (!id || seen.has(id)) return;
                        seen.add(id);
                        order.push(id);
                });
                return order;
        };

        setGroupRef = (id, node) => {
                if (!id) return;
                if (node) {
                        this.groupRefs.set(id, node);
                } else {
                        this.groupRefs.delete(id);
                }
        };

        attachFlyoutListeners = () => {
                if (this.flyoutListenerAttached || typeof document === 'undefined') return;
                document.addEventListener('mousedown', this.handleDocumentPointerDown, true);
                document.addEventListener('focusin', this.handleDocumentPointerDown, true);
                this.flyoutListenerAttached = true;
        };

        detachFlyoutListeners = () => {
                if (!this.flyoutListenerAttached || typeof document === 'undefined') return;
                document.removeEventListener('mousedown', this.handleDocumentPointerDown, true);
                document.removeEventListener('focusin', this.handleDocumentPointerDown, true);
                this.flyoutListenerAttached = false;
        };

        handleDocumentPointerDown = (event) => {
                const { activeAppFlyout } = this.state;
                if (!activeAppFlyout) return;
                const container = this.groupRefs.get(activeAppFlyout);
                const target = event.target;
                if (container && target instanceof Node && container.contains(target)) {
                        return;
                }
                this.closeGroupFlyout();
        };

        openGroupFlyout = (groupId, index = 0, total = null) => {
                if (!groupId) return;
                const maxIndex = typeof total === 'number' && total > 0 ? total - 1 : null;
                let safeIndex = typeof index === 'number' ? index : 0;
                if (maxIndex !== null) {
                        safeIndex = Math.min(Math.max(safeIndex, 0), maxIndex);
                } else if (safeIndex < 0) {
                        safeIndex = 0;
                }
                this.pendingFlyoutId = groupId;
                this.pendingFlyoutIndex = safeIndex;
                this.activeFlyoutIndex = safeIndex;
                this.setState({ activeAppFlyout: groupId, activeFlyoutIndex: safeIndex }, () => {
                        this.attachFlyoutListeners();
                        this.pendingFlyoutId = null;
                        this.pendingFlyoutIndex = null;
                });
        };

        closeGroupFlyout = () => {
                if (!this.state.activeAppFlyout && this.state.activeFlyoutIndex === null) {
                        this.detachFlyoutListeners();
                        return;
                }
                this.detachFlyoutListeners();
                this.pendingFlyoutId = null;
                this.pendingFlyoutIndex = null;
                this.activeFlyoutIndex = 0;
                this.setState({ activeAppFlyout: null, activeFlyoutIndex: null });
        };

        handleGroupButtonClick = (group) => {
                if (!group) return;
                const hasMultiple = Array.isArray(group.instances) && group.instances.length > 1;
                if (!hasMultiple) {
                        const instance = group.instances?.[0]?.original;
                        if (instance) {
                                this.handleAppButtonClick(instance);
                        }
                        return;
                }
                if (this.state.activeAppFlyout === group.id) {
                        this.closeGroupFlyout();
                        return;
                }
                const focusedIndex = group.instances.findIndex((instance) => instance.isFocused && !instance.isMinimized);
                const initialIndex = focusedIndex !== -1 ? focusedIndex : 0;
                this.openGroupFlyout(group.id, initialIndex, group.instances.length);
        };

        handleGroupButtonKeyDown = (event, group) => {
                const hasMultiple = Array.isArray(group?.instances) && group.instances.length > 1;
                if (!hasMultiple) {
                        const instance = group?.instances?.[0]?.original;
                        if (instance) {
                                this.handleAppButtonKeyDown(event, instance);
                        }
                        return;
                }
                const { key } = event;
                if (key === 'ArrowDown' || key === 'ArrowUp') {
                        event.preventDefault();
                        const total = group.instances.length;
                        const isOpen = this.state.activeAppFlyout === group.id || this.pendingFlyoutId === group.id;
                        let nextIndex;
                        if (isOpen) {
                                const direction = key === 'ArrowDown' ? 1 : -1;
                                const currentIndex = typeof this.activeFlyoutIndex === 'number' ? this.activeFlyoutIndex : 0;
                                nextIndex = (currentIndex + direction + total) % total;
                                this.activeFlyoutIndex = nextIndex;
                                this.setState({ activeFlyoutIndex: nextIndex });
                        } else {
                                nextIndex = key === 'ArrowDown' ? 0 : total - 1;
                                this.openGroupFlyout(group.id, nextIndex, total);
                        }
                        return;
                }
                if (key === 'Enter' || key === ' ') {
                        event.preventDefault();
                        if (this.state.activeAppFlyout === group.id) {
                                const index = typeof this.state.activeFlyoutIndex === 'number'
                                        ? this.state.activeFlyoutIndex
                                        : (typeof this.activeFlyoutIndex === 'number' ? this.activeFlyoutIndex : 0);
                                const instance = group.instances[index];
                                if (instance) {
                                        this.handleInstanceSelect(group, instance, index);
                                }
                        } else {
                                const total = group.instances.length;
                                let initialIndex = 0;
                                if (typeof this.state.activeFlyoutIndex === 'number') {
                                        initialIndex = this.state.activeFlyoutIndex;
                                } else if (typeof this.activeFlyoutIndex === 'number') {
                                        initialIndex = this.activeFlyoutIndex;
                                }
                                if (!Number.isInteger(initialIndex) || initialIndex < 0 || initialIndex >= total) {
                                        initialIndex = 0;
                                }
                                this.openGroupFlyout(group.id, initialIndex, total);
                        }
                        return;
                }
                if (key === 'Escape' && this.state.activeAppFlyout === group.id) {
                        event.preventDefault();
                        this.closeGroupFlyout();
                }
        };

        getInstanceLabel = (group, instance, index) => {
                if (!instance) return group?.title || group?.id || '';
                const source = instance.original || instance;
                if (typeof source.label === 'string') return source.label;
                if (typeof source.instanceTitle === 'string') return source.instanceTitle;
                if (typeof source.windowTitle === 'string') return source.windowTitle;
                if (typeof source.displayName === 'string') return source.displayName;
                const baseTitle = instance.title || group?.title || group?.id || '';
                if (Array.isArray(group?.instances) && group.instances.length > 1) {
                        return `${baseTitle} (${index + 1})`;
                }
                return baseTitle;
        };

        getInstanceCommandId = (group, instance) => {
                if (!instance) return null;
                const source = instance.original || instance;
                const candidates = [
                        instance.windowId,
                        source?.windowId,
                        source?.windowID,
                        source?.instanceId,
                        source?.instanceID
                ];
                for (let idx = 0; idx < candidates.length; idx += 1) {
                        const value = candidates[idx];
                        if (typeof value === 'string' && value.length) {
                                return value;
                        }
                }
                if (source && typeof source.id === 'string' && source.id !== group?.id) {
                        return source.id;
                }
                return null;
        };

        handleInstanceSelect = (group, instance, index) => {
                if (!group || !instance) return;
                const detail = { appId: group.id, action: 'focus' };
                const commandId = this.getInstanceCommandId(group, instance);
                if (commandId && commandId !== group.id) {
                        detail.instanceId = commandId;
                        detail.windowId = commandId;
                }
                this.dispatchTaskbarCommand(detail);
                this.closeGroupFlyout();
        };

        renderGroupFlyout = (group) => {
                const total = group.instances.length;
                const isOpen = this.state.activeAppFlyout === group.id;
                if (!isOpen) return null;
                const fallbackIndex = typeof this.activeFlyoutIndex === 'number' ? this.activeFlyoutIndex : 0;
                const activeIndexRaw = typeof this.state.activeFlyoutIndex === 'number'
                        ? this.state.activeFlyoutIndex
                        : fallbackIndex;
                const activeIndex = Math.min(Math.max(activeIndexRaw, 0), Math.max(total - 1, 0));
                return (
                        <div
                                role="menu"
                                aria-label={`${group.title || group.id} windows`}
                                aria-hidden={!isOpen}
                                className="absolute left-0 top-full z-[270] mt-1 flex min-w-[200px] flex-col rounded-md border border-white/10 bg-[#131b2b] p-1 text-left shadow-xl"
                                data-testid={`taskbar-flyout-${group.id}`}
                        >
                                {group.instances.map((instance, index) => {
                                        const label = this.getInstanceLabel(group, instance, index);
                                        const isActive = index === activeIndex;
                                        const isFocused = instance.isFocused && !instance.isMinimized;
                                        const minimized = instance.isMinimized;
                                        return (
                                                <button
                                                        key={this.getInstanceCommandId(group, instance) || `${group.id}:${index}`}
                                                        type="button"
                                                        role="menuitem"
                                                        aria-current={isActive ? 'true' : undefined}
                                                        data-active={isActive ? 'true' : 'false'}
                                                        onClick={() => this.handleInstanceSelect(group, instance, index)}
                                                        onMouseEnter={() => {
                                                                if (this.state.activeFlyoutIndex !== index) {
                                                                        this.setState({ activeFlyoutIndex: index });
                                                                }
                                                        }}
                                                        className={`flex items-center justify-between gap-3 rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] ${
                                                                isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10'
                                                        }`}
                                                >
                                                        <span className="flex min-w-0 items-center gap-2">
                                                                <span
                                                                        aria-hidden="true"
                                                                        className={`h-2 w-2 rounded-full ${
                                                                                isFocused ? 'bg-[#53b9ff]' : minimized ? 'bg-white/25' : 'bg-white/50'
                                                                        }`}
                                                                />
                                                                <span className="truncate">{label}</span>
                                                        </span>
                                                        {minimized ? (
                                                                <span className="text-[10px] uppercase tracking-wide text-white/40">Minimized</span>
                                                        ) : null}
                                                </button>
                                        );
                                })}
                        </div>
                );
        };

        renderRunningApps = () => {
                const { groups } = this.groupRunningApps();
                if (!groups.length) return null;

                return (
                        <ul
                                ref={this.taskbarListRef}
                                className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                role="list"
                                aria-label="Open applications"
                                onDragOver={this.handleTaskbarDragOver}
                                onDrop={this.handleTaskbarDrop}
                        >
                                {groups.map((group) => this.renderRunningAppGroup(group))}
                        </ul>
                );
        };

        renderRunningAppGroup = (group) => {
                const hasMultiple = Array.isArray(group.instances) && group.instances.length > 1;
                const isFlyoutOpen = this.state.activeAppFlyout === group.id;
                const primaryInstance = group.instances?.[0]?.original || group.instances?.[0];
                const buttonLabel = group.title || primaryInstance?.title || group.id;
                const iconSrc = group.icon || primaryInstance?.icon;
                const isActive = group.isActive;
                const isFocused = group.isFocused;

                return (
                        <li
                                key={group.id}
                                className="relative flex"
                                draggable
                                data-app-id={group.id}
                                role="listitem"
                                onDragStart={(event) => this.handleAppDragStart(event, group)}
                                onDragOver={this.handleAppDragOver}
                                onDrop={(event) => this.handleAppDrop(event, group.id)}
                                onDragEnd={this.handleAppDragEnd}
                                ref={(node) => this.setGroupRef(group.id, node)}
                        >
                                <div className="relative">
                                        <button
                                                type="button"
                                                aria-label={buttonLabel}
                                                aria-pressed={isActive}
                                                aria-haspopup={hasMultiple ? 'menu' : undefined}
                                                aria-expanded={hasMultiple ? (isFlyoutOpen ? 'true' : 'false') : undefined}
                                                data-context="taskbar"
                                                data-app-id={group.id}
                                                data-active={isActive ? 'true' : 'false'}
                                                onClick={() => this.handleGroupButtonClick(group)}
                                                onKeyDown={(event) => this.handleGroupButtonKeyDown(event, group)}
                                                className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} relative flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                                        >
                                                <span className="relative inline-flex items-center justify-center">
                                                        {iconSrc ? (
                                                                <Image
                                                                        src={iconSrc}
                                                                        alt=""
                                                                        width={28}
                                                                        height={28}
                                                                        className="h-6 w-6"
                                                                />
                                                        ) : null}
                                                        {isActive && (
                                                                <span
                                                                        aria-hidden="true"
                                                                        data-testid="running-indicator"
                                                                        className="absolute -bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-current"
                                                                />
                                                        )}
                                                </span>
                                                <span className="hidden whitespace-nowrap text-white md:inline">{buttonLabel}</span>
                                                {hasMultiple ? (
                                                        <span className="ml-auto inline-flex min-w-[1.5rem] justify-center rounded-full bg-white/10 px-1 py-0.5 text-[10px] font-semibold text-white/70">
                                                                {group.instances.length}
                                                        </span>
                                                ) : null}
                                        </button>
                                        {hasMultiple && isFlyoutOpen ? this.renderGroupFlyout(group) : null}
                                </div>
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
                        this.pendingReorder = this.getGroupedAppOrder(updated);
                        return { runningApps: updated };
                }, () => {
                        if (this.pendingReorder && this.pendingReorder.length) {
                                this.dispatchTaskbarCommand({ action: 'reorder', order: this.pendingReorder });
                        }
                        this.pendingReorder = null;
                });
        };

        computeReorderedApps = (apps, sourceId, targetId, insertAfter) => {
                if (!Array.isArray(apps) || apps.length === 0) return null;
                if (sourceId === targetId) return null;

                const { groups } = this.groupRunningApps(apps);
                if (!groups.length) return null;

                const currentOrder = groups.map((group) => group.id);
                const sourceIndex = currentOrder.indexOf(sourceId);
                if (sourceIndex === -1) return null;

                const order = [...currentOrder];
                const [moved] = order.splice(sourceIndex, 1);

                let insertIndex;
                if (!targetId) {
                        insertIndex = insertAfter ? order.length : 0;
                } else {
                        const targetIndex = order.indexOf(targetId);
                        if (targetIndex === -1) {
                                insertIndex = order.length;
                        } else {
                                insertIndex = insertAfter ? targetIndex + 1 : targetIndex;
                        }
                }

                if (insertIndex < 0) insertIndex = 0;
                if (insertIndex > order.length) insertIndex = order.length;

                order.splice(insertIndex, 0, moved);

                const unchanged = order.length === currentOrder.length && order.every((id, index) => id === currentOrder[index]);
                if (unchanged) return null;

                const groupMap = new Map(groups.map((group) => [group.id, group.instances]));
                const flattened = [];
                order.forEach((id) => {
                        const instances = groupMap.get(id) || [];
                        instances.forEach((entry) => {
                                flattened.push(entry.original);
                        });
                });

                if (flattened.length !== apps.length) return null;

                return flattened;
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
