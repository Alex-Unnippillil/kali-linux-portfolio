import React, { PureComponent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import usePersistentState from '../../hooks/usePersistentState';
import apps from '../../apps.config';
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

const PIN_STORAGE_PREFIX = 'taskbar-pins';
const DEFAULT_VIEWPORT_KEY = 'desktop';
const DEFAULT_PIN_ICON = '/themes/Yaru/apps/bash.svg';
const DEFAULT_STORAGE_KEY = `${PIN_STORAGE_PREFIX}:default:${DEFAULT_VIEWPORT_KEY}`;
const USER_STORAGE_CANDIDATES = [
        'active-user-id',
        'active-user',
        'desktop-user',
        'current-user',
        'session-user',
];

const APP_METADATA = new Map(apps.map((app) => [app.id, app]));

const isValidPinnedArray = (value) => Array.isArray(value) && value.every((id) => typeof id === 'string');

const normalizePinnedIds = (ids) => {
        if (!Array.isArray(ids)) return [];
        const seen = new Set();
        const normalized = [];
        ids.forEach((value) => {
                if (typeof value !== 'string') return;
                const trimmed = value.trim();
                if (!trimmed || seen.has(trimmed)) return;
                seen.add(trimmed);
                normalized.push(trimmed);
        });
        return normalized;
};

const formatFallbackTitle = (id) => {
        if (typeof id !== 'string' || !id) return 'Application';
        return id
                .replace(/[-_]+/g, ' ')
                .replace(/\b\w/g, (match) => match.toUpperCase());
};

const safeGetLocalStorageItem = (key) => {
        try {
                return window.localStorage.getItem(key);
        } catch (error) {
                return null;
        }
};

const getActiveUserId = () => {
        if (typeof window === 'undefined') return 'default';
        for (const key of USER_STORAGE_CANDIDATES) {
                const value = safeGetLocalStorageItem(key);
                if (value) return String(value);
        }
        return 'default';
};

const getViewportKey = () => {
        if (typeof window === 'undefined') return DEFAULT_VIEWPORT_KEY;
        const width = typeof window.innerWidth === 'number' ? window.innerWidth : 0;
        if (width >= 1440) return 'wide';
        if (width >= 1024) return 'desktop';
        if (width >= 768) return 'tablet';
        return 'mobile';
};

const buildStorageKey = (userId, viewport) => `${PIN_STORAGE_PREFIX}:${userId || 'default'}:${viewport || DEFAULT_VIEWPORT_KEY}`;

const computeStorageKey = () => buildStorageKey(getActiveUserId(), getViewportKey());

class NavbarBase extends PureComponent {
        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false,
                        workspaces: [],
                        activeWorkspace: 0,
                        runningApps: [],
                };
                this.taskbarListRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
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

        getDisplayApps = () => {
                const { runningApps } = this.state;
                const pinnedIds = Array.isArray(this.props.pinnedApps) ? this.props.pinnedApps : [];
                if (!pinnedIds.length && !runningApps.length) return [];

                const runningMap = new Map();
                runningApps.forEach((app) => {
                        if (app && typeof app.id === 'string') {
                                runningMap.set(app.id, app);
                        }
                });

                const pinnedEntries = pinnedIds
                        .map((id) => {
                                if (!id) return null;
                                const running = runningMap.get(id);
                                if (running) {
                                        return { ...running, isPinned: true, isRunning: true };
                                }
                                const metadata = APP_METADATA.get(id) || {};
                                return {
                                        id,
                                        title: metadata.title || formatFallbackTitle(id),
                                        icon: metadata.icon || DEFAULT_PIN_ICON,
                                        isFocused: false,
                                        isMinimized: true,
                                        isPinned: true,
                                        isRunning: false,
                                };
                        })
                        .filter(Boolean);

                const pinnedSet = new Set(pinnedEntries.map((entry) => entry.id));
                const runningOnly = runningApps
                        .filter((app) => app && !pinnedSet.has(app.id))
                        .map((app) => ({ ...app, isPinned: false, isRunning: true }));

                return [...pinnedEntries, ...runningOnly];
        };

        renderRunningApps = () => {
                const entries = this.getDisplayApps();
                if (!entries.length) return null;

                return (
                        <ul
                                ref={this.taskbarListRef}
                                className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                role="list"
                                aria-label="Open applications"
                                onDragOver={this.handleTaskbarDragOver}
                                onDrop={this.handleTaskbarDrop}
                        >
                                {entries.map((app) => this.renderRunningAppItem(app))}
                        </ul>
                );
        };

        renderRunningAppItem = (app) => (
                <li
                        key={app.id}
                        className="flex"
                        draggable
                        data-app-id={app.id}
                        data-pinned={app.isPinned ? 'true' : 'false'}
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
                const isActive = Boolean(app.isRunning && !app.isMinimized);
                const isFocused = Boolean(app.isRunning && app.isFocused && isActive);

                return (
                        <button
                                type="button"
                                aria-label={app.title}
                                aria-pressed={isActive}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                data-pinned={app.isPinned ? 'true' : 'false'}
                                onClick={() => this.handleAppButtonClick(app)}
                                onKeyDown={(event) => this.handleAppButtonKeyDown(event, app)}
                                className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} relative flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                        >
                                <span className="relative inline-flex items-center justify-center">
                                        <Image
                                                src={app.icon || DEFAULT_PIN_ICON}
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
                this.reorderTaskbarItems(sourceId, null, true);
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
                this.reorderTaskbarItems(sourceId, targetId, insertAfter);
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

        reorderTaskbarItems = (sourceId, targetId, insertAfter = false) => {
                if (!sourceId) return;
                const pinnedIds = Array.isArray(this.props.pinnedApps) ? this.props.pinnedApps : [];
                const pinnedSet = new Set(pinnedIds);
                const sourcePinned = pinnedSet.has(sourceId);
                const targetPinned = targetId ? pinnedSet.has(targetId) : false;

                if (sourcePinned) {
                        const updated = this.computePinnedReorder(pinnedIds, sourceId, targetId, insertAfter, targetPinned);
                        if (updated && this.props.onPinnedReorder) {
                                this.props.onPinnedReorder(updated);
                        }
                        return;
                }

                if (targetPinned) {
                        targetId = null;
                        insertAfter = false;
                }

                this.reorderRunningAppsInternal(sourceId, targetId, insertAfter);
        };

        computePinnedReorder = (ids, sourceId, targetId, insertAfter, targetIsPinned) => {
                if (!Array.isArray(ids) || ids.length === 0) return null;
                const current = [...ids];
                const sourceIndex = current.indexOf(sourceId);
                if (sourceIndex === -1) return null;

                const [moved] = current.splice(sourceIndex, 1);

                let insertIndex;
                if (!targetId || !targetIsPinned) {
                        insertIndex = insertAfter ? current.length : 0;
                } else {
                        const targetIndex = current.indexOf(targetId);
                        insertIndex = targetIndex === -1 ? current.length : (insertAfter ? targetIndex + 1 : targetIndex);
                }

                if (insertIndex < 0) insertIndex = 0;
                if (insertIndex > current.length) insertIndex = current.length;

                current.splice(insertIndex, 0, moved);

                const unchanged = ids.length === current.length && ids.every((id, index) => id === current[index]);
                if (unchanged) return null;
                return current;
        };

        reorderRunningAppsInternal = (sourceId, targetId, insertAfter = false) => {
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

        computeReorderedApps = (appsList, sourceId, targetId, insertAfter) => {
                if (!Array.isArray(appsList) || appsList.length === 0) return null;
                if (sourceId === targetId) return null;

                const list = [...appsList];
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

                const unchanged = appsList.length === list.length && appsList.every((item, index) => item.id === list[index].id);
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
                                        '--desktop-navbar-height': `calc(${NAVBAR_HEIGHT}px + var(--safe-area-top, 0px) + 0.375rem + 0.25rem)`,
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

function Navbar(props) {
        const [storageKey, setStorageKey] = useState(() => (typeof window === 'undefined' ? DEFAULT_STORAGE_KEY : computeStorageKey()));
        const [pinnedApps, setPinnedApps] = usePersistentState(storageKey, () => [], isValidPinnedArray);
        const [hydrated, setHydrated] = useState(false);

        const applyPinnedUpdate = useCallback((updater) => {
                setPinnedApps((prev) => {
                        const current = normalizePinnedIds(prev);
                        const result = typeof updater === 'function' ? updater([...current]) : updater;
                        const next = normalizePinnedIds(result);
                        const unchanged = current.length === next.length && current.every((id, index) => id === next[index]);
                        return unchanged ? prev : next;
                });
        }, [setPinnedApps]);

        useEffect(() => {
                if (hydrated) return;
                setHydrated(true);
                applyPinnedUpdate(pinnedApps);
        }, [hydrated, pinnedApps, applyPinnedUpdate]);

        useEffect(() => {
                if (typeof window === 'undefined') return undefined;

                const syncKey = () => {
                        const nextKey = computeStorageKey();
                        if (nextKey === storageKey) return;
                        let restored = [];
                        try {
                                const stored = window.localStorage.getItem(nextKey);
                                if (stored) {
                                        const parsed = JSON.parse(stored);
                                        if (isValidPinnedArray(parsed)) {
                                                restored = parsed;
                                        }
                                }
                        } catch (error) {
                                restored = [];
                        }
                        setStorageKey(nextKey);
                        applyPinnedUpdate(restored);
                };

                syncKey();

                let frame = null;
                const handleResize = () => {
                        if (frame) window.cancelAnimationFrame(frame);
                        frame = window.requestAnimationFrame(syncKey);
                };

                window.addEventListener('resize', handleResize);
                return () => {
                        if (frame) window.cancelAnimationFrame(frame);
                        window.removeEventListener('resize', handleResize);
                };
        }, [storageKey, applyPinnedUpdate]);

        useEffect(() => {
                if (typeof window === 'undefined') return undefined;
                const handlePinRequest = (event) => {
                        const detail = event?.detail || {};
                        const rawId = typeof detail.appId === 'string' ? detail.appId.trim() : '';
                        if (!rawId) return;
                        const shouldPin = detail.pin !== false;
                        applyPinnedUpdate((current) => {
                                const index = current.indexOf(rawId);
                                if (shouldPin) {
                                        if (index !== -1) return current;
                                        current.push(rawId);
                                        return current;
                                }
                                if (index === -1) return current;
                                current.splice(index, 1);
                                return current;
                        });
                };

                window.addEventListener('taskbar-pin-request', handlePinRequest);
                return () => {
                        window.removeEventListener('taskbar-pin-request', handlePinRequest);
                };
        }, [applyPinnedUpdate]);

        const normalizedPinned = useMemo(() => normalizePinnedIds(pinnedApps), [pinnedApps]);

        useEffect(() => {
                if (typeof window === 'undefined') return undefined;
                window.dispatchEvent(new CustomEvent('taskbar-pins-change', { detail: { pinnedApps: normalizedPinned } }));
        }, [normalizedPinned]);

        const handlePinnedReorder = useCallback((nextOrder) => {
                applyPinnedUpdate(Array.isArray(nextOrder) ? nextOrder : []);
        }, [applyPinnedUpdate]);

        return <NavbarBase {...props} pinnedApps={normalizedPinned} onPinnedReorder={handlePinnedReorder} />;
}

export default Navbar;
