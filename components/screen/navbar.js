'use client';

import React, { PureComponent } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';

import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { NAVBAR_HEIGHT } from '../../utils/uiConstants';
import TaskbarPreviewFlyout from './TaskbarPreviewFlyout';
import ControlCenter from '../ui/ControlCenter';

const BADGE_TONE_COLORS = Object.freeze({
        accent: { bg: '#3b82f6', fg: '#020817', glow: 'rgba(59,130,246,0.45)', track: 'rgba(8,15,26,0.82)' },
        info: { bg: '#38bdf8', fg: '#04121f', glow: 'rgba(56,189,248,0.45)', track: 'rgba(8,15,26,0.82)' },
        success: { bg: '#22c55e', fg: '#032014', glow: 'rgba(34,197,94,0.48)', track: 'rgba(8,15,26,0.82)' },
        warning: { bg: '#fbbf24', fg: '#111827', glow: 'rgba(251,191,36,0.45)', track: 'rgba(8,15,26,0.82)' },
        danger: { bg: '#f97316', fg: '#ffffff', glow: 'rgba(249,115,22,0.52)', track: 'rgba(8,15,26,0.82)' },
        neutral: { bg: '#94a3b8', fg: '#0f172a', glow: 'rgba(148,163,184,0.4)', track: 'rgba(8,15,26,0.82)' },
});

const resolveBadgeTone = (tone) => {
        if (typeof tone !== 'string') return BADGE_TONE_COLORS.accent;
        const normalized = tone.trim().toLowerCase();
        return BADGE_TONE_COLORS[normalized] || BADGE_TONE_COLORS.accent;
};

const areWorkspacesEqual = (next, prev) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                if (next[index] !== prev[index]) {
                        return false;
                }
        }
        return true;
};

const TASKBAR_PREVIEW_WIDTH = 280;

const normalizePinnedApps = (payload) => {
        if (!payload) return [];
        if (Array.isArray(payload)) {
                return payload.filter((item) => item && typeof item.id !== 'undefined');
        }
        return [];
};

const clampIndex = (value, min, max) => Math.min(Math.max(value, min), max);

const reorderList = (list, sourceId, targetId, insertAfter = false) => {
        if (!Array.isArray(list) || list.length === 0) return null;
        if (!sourceId || sourceId === targetId) return null;

        const working = [...list];
        const sourceIndex = working.findIndex((item) => item.id === sourceId);
        if (sourceIndex === -1) return null;

        const [moved] = working.splice(sourceIndex, 1);
        const targetIndex = targetId ? working.findIndex((item) => item.id === targetId) : -1;
        const defaultIndex = insertAfter ? working.length : 0;
        const desiredIndex = targetIndex === -1 ? defaultIndex : (insertAfter ? targetIndex + 1 : targetIndex);
        const insertIndex = clampIndex(desiredIndex, 0, working.length);

        working.splice(insertIndex, 0, moved);
        const unchanged = list.length === working.length && list.every((item, index) => item.id === working[index].id);
        return unchanged ? null : working;
};

const safeParsePinnedPayload = (payload) => {
        if (Array.isArray(payload)) return normalizePinnedApps(payload);
        if (typeof payload === 'string') {
                try {
                        const parsed = JSON.parse(payload);
                        return normalizePinnedApps(parsed);
                } catch (error) {
                        return [];
                }
        }
        return [];
};

const RunningAppsList = React.forwardRef(({ apps, renderItem, onDragOver, onDrop }, ref) => {
        if (!apps?.length) return null;

        return (
                <ul
                        ref={ref}
                        className="flex max-w-[60vw] md:max-w-[45vw] items-center gap-1 overflow-x-auto rounded-lg border border-white/[0.06] bg-slate-950/60 px-1.5 py-1 backdrop-blur-sm"
                        role="list"
                        aria-label="Open applications"
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                >
                        {apps.map((app) => renderItem(app))}
                </ul>
        );
});

RunningAppsList.displayName = 'RunningAppsList';

const PinnedAppsList = React.forwardRef(({ apps, renderItem, onDragOver, onDrop }, ref) => {
        const hasItems = Array.isArray(apps) && apps.length > 0;

        return (
                <ul
                        ref={ref}
                        className="flex min-h-[2.25rem] items-center gap-1 overflow-x-auto rounded-lg border border-white/[0.06] bg-slate-950/60 px-1.5 py-1 backdrop-blur-sm"
                        role="list"
                        aria-label="Pinned applications"
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                >
                        {hasItems
                                ? apps.map((app) => renderItem(app))
                                : (
                                        <li className="pointer-events-none select-none px-2 text-xs text-white/40">
                                                Drag apps here to pin
                                        </li>
                                )}
                </ul>
        );
});

PinnedAppsList.displayName = 'PinnedAppsList';

const SystemTrayCluster = ({
        children,
        statusCardOpen,
        onStatusToggle,
        onStatusKeyDown,
}) => (
        <div className="flex items-center gap-3 text-xs md:text-sm">
                <div className="hidden md:block">
                        <PerformanceGraph />
                </div>
                <Clock onlyTime={true} showCalendar={true} hour12={false} variant="minimal" />
                <ControlCenter />
                <div
                        id="status-bar"
                        className="flex items-center gap-2 rounded px-2 py-1"
                >
                        <Status />
                </div>
                {children}
        </div>
);
const areBadgesEqual = (nextBadge, prevBadge) => {
        if (nextBadge === prevBadge) return true;
        if (!nextBadge || !prevBadge) return false;
        if (nextBadge.type !== prevBadge.type) return false;
        if ((nextBadge.displayValue || prevBadge.displayValue) && nextBadge.displayValue !== prevBadge.displayValue) return false;
        if ((typeof nextBadge.count === 'number' || typeof prevBadge.count === 'number') && nextBadge.count !== prevBadge.count) return false;
        if ((typeof nextBadge.max === 'number' || typeof prevBadge.max === 'number') && nextBadge.max !== prevBadge.max) return false;
        if ((typeof nextBadge.progress === 'number' || typeof prevBadge.progress === 'number')) {
                const progressA = typeof nextBadge.progress === 'number' ? nextBadge.progress : 0;
                const progressB = typeof prevBadge.progress === 'number' ? prevBadge.progress : 0;
                if (Math.abs(progressA - progressB) > 0.0005) {
                        return false;
                }
        }
        if ((nextBadge.label || prevBadge.label) && nextBadge.label !== prevBadge.label) return false;
        if ((nextBadge.tone || prevBadge.tone) && nextBadge.tone !== prevBadge.tone) return false;
        if (Boolean(nextBadge.pulse) !== Boolean(prevBadge.pulse)) return false;
        if (Boolean(nextBadge.persistOnFocus) !== Boolean(prevBadge.persistOnFocus)) return false;
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
                        a.isMinimized !== b.isMinimized ||
                        !areBadgesEqual(a.badge, b.badge)
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
                        preview: null,
                        pinnedApps: [],
                };
                this.taskbarListRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.previewFlyoutRef = React.createRef();
                this.previewHideTimeout = null;
                this.previewRequestSequence = 0;
                this.previewFocusPending = false;
                this.previewRefreshInterval = null;
                this.previewRefreshInFlight = false;
                this.previewUpdatingTimeout = null;
                this.previewUpdatingMinUntil = 0;
                this.pendingPinnedReorder = null;
                this.draggingSection = null;
                this.navbarRef = React.createRef();
                this.resizeObserver = null;
                this.observedNavbarElement = null;
                this.pendingOffsetUpdate = null;
                this.lastNavbarHeight = null;
        }

        isAppRunning = (app) => {
                const appId = app?.id;
                if (!appId) return false;
                if (typeof app?.isRunning === 'boolean') return app.isRunning;
                const runningApps = this.state?.runningApps || [];
                return runningApps.some((item) => item?.id === appId);
        };

        componentDidMount() {
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.addEventListener('taskbar-preview-response', this.handlePreviewResponse);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                        window.addEventListener('resize', this.handleWindowResize);
                        window.addEventListener('orientationchange', this.handleWindowResize);
                        this.initializeResizeObserver();
                        this.scheduleDesktopOffsetUpdate();
                }
                if (typeof document !== 'undefined') {
                        document.addEventListener('keydown', this.handleDocumentKeyDown);
                }
        }

        componentWillUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.removeEventListener('taskbar-preview-response', this.handlePreviewResponse);
                        window.removeEventListener('resize', this.handleWindowResize);
                        window.removeEventListener('orientationchange', this.handleWindowResize);
                }
                if (typeof document !== 'undefined') {
                        document.removeEventListener('keydown', this.handleDocumentKeyDown);
                }
                this.clearPreviewHideTimeout();
                this.stopPreviewAutoRefresh();
                this.teardownResizeObserver();
                this.resetDesktopOffset();
        }

        componentDidUpdate() {
                this.initializeResizeObserver();
                this.scheduleDesktopOffsetUpdate();
        }

        initializeResizeObserver = () => {
                if (typeof window === 'undefined') return;
                const ResizeObserverCtor = window.ResizeObserver;
                if (typeof ResizeObserverCtor !== 'function') return;
                const target = this.navbarRef?.current;
                if (!target) return;
                if (!this.resizeObserver) {
                        this.resizeObserver = new ResizeObserverCtor(() => {
                                this.scheduleDesktopOffsetUpdate();
                        });
                }
                if (this.observedNavbarElement && this.observedNavbarElement !== target && typeof this.resizeObserver.unobserve === 'function') {
                        this.resizeObserver.unobserve(this.observedNavbarElement);
                }
                if (typeof this.resizeObserver.observe === 'function') {
                        this.resizeObserver.observe(target);
                        this.observedNavbarElement = target;
                }
        };

        teardownResizeObserver = () => {
                if (this.resizeObserver && typeof this.resizeObserver.disconnect === 'function') {
                        this.resizeObserver.disconnect();
                        this.resizeObserver = null;
                }
                this.observedNavbarElement = null;
                if (this.pendingOffsetUpdate && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
                        window.cancelAnimationFrame(this.pendingOffsetUpdate);
                }
                this.pendingOffsetUpdate = null;
        };

        handleWindowResize = () => {
                this.scheduleDesktopOffsetUpdate();
        };

        scheduleDesktopOffsetUpdate = () => {
                if (typeof window === 'undefined') return;
                if (this.pendingOffsetUpdate !== null && typeof window.cancelAnimationFrame === 'function') {
                        window.cancelAnimationFrame(this.pendingOffsetUpdate);
                        this.pendingOffsetUpdate = null;
                }
                if (typeof window.requestAnimationFrame === 'function') {
                        this.pendingOffsetUpdate = window.requestAnimationFrame(() => {
                                this.pendingOffsetUpdate = null;
                                this.updateDesktopOffset();
                        });
                } else {
                        this.updateDesktopOffset();
                }
        };

        resetDesktopOffset = () => {
                if (typeof document !== 'undefined' && document.documentElement?.style) {
                        document.documentElement.style.removeProperty('--desktop-navbar-height');
                }
                if (this.navbarRef?.current?.parentElement?.style) {
                        this.navbarRef.current.parentElement.style.removeProperty('--desktop-navbar-height');
                }
                this.lastNavbarHeight = null;
        };

        updateDesktopOffset = () => {
                if (typeof window === 'undefined') return;
                const element = this.navbarRef?.current;
                if (!element || typeof element.getBoundingClientRect !== 'function') return;
                const rect = element.getBoundingClientRect();
                if (!rect) return;
                const height = rect.height;
                if (!Number.isFinite(height) || height <= 0) return;
                const normalizedHeight = Math.round(height * 1000) / 1000;
                if (this.lastNavbarHeight !== null && Math.abs(this.lastNavbarHeight - normalizedHeight) < 0.5) {
                        return;
                }
                this.lastNavbarHeight = normalizedHeight;
                const value = `${normalizedHeight}px`;
                if (element.parentElement && element.parentElement.style && typeof element.parentElement.style.setProperty === 'function') {
                        element.parentElement.style.setProperty('--desktop-navbar-height', value);
                }
                if (typeof document !== 'undefined' && document.documentElement?.style && typeof document.documentElement.style.setProperty === 'function') {
                        document.documentElement.style.setProperty('--desktop-navbar-height', value);
                }
        };

        escapeAttributeValue = (value) => {
                if (typeof value !== 'string') return '';
                if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
                        return CSS.escape(value);
                }
                return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        };

        getTaskbarButtonElement = (appId) => {
                if (!appId || !this.taskbarListRef?.current) return null;
                const selectorValue = this.escapeAttributeValue(appId);
                return this.taskbarListRef.current.querySelector(`button[data-app-id="${selectorValue}"]`);
        };

        computePreviewPosition = (rect) => {
                if (!rect) return { top: 0, left: 0 };
                const offset = 8;
                const viewportWidth = typeof window !== 'undefined' ? window.innerWidth || 0 : 0;
                const center = rect.left + rect.width / 2;
                const halfWidth = TASKBAR_PREVIEW_WIDTH / 2;
                let left = center;
                if (viewportWidth) {
                        const min = halfWidth + 8;
                        const max = viewportWidth - halfWidth - 8;
                        if (min <= max) {
                                left = Math.min(Math.max(center, min), max);
                        }
                }
                const top = rect.bottom + offset;
                return { top, left };
        };

        dispatchPreviewRequest = (appId, requestId, bustCache = false) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(
                        new CustomEvent('taskbar-preview-request', {
                                detail: { appId, requestId, bustCache },
                        }),
                );
        };

        clearPreviewHideTimeout = () => {
                if (this.previewHideTimeout) {
                        clearTimeout(this.previewHideTimeout);
                        this.previewHideTimeout = null;
                }
        };

        schedulePreviewHide = () => {
                this.clearPreviewHideTimeout();
                this.previewHideTimeout = setTimeout(() => {
                        this.hidePreview();
                }, 120);
        };

        hidePreview = () => {
                this.clearPreviewHideTimeout();
                this.previewFocusPending = false;
                this.stopPreviewAutoRefresh();
                this.clearPreviewUpdatingTimeout();
                this.setState((prevState) => (prevState.preview ? { preview: null } : null));
        };

        clearPreviewUpdatingTimeout = () => {
                if (this.previewUpdatingTimeout) {
                        clearTimeout(this.previewUpdatingTimeout);
                        this.previewUpdatingTimeout = null;
                }
        };

        setPreviewUpdating = (value, options = {}) => {
                const { minDurationMs = 900, requestId, appId } = options || {};
                this.clearPreviewUpdatingTimeout();
                if (value) {
                        this.previewUpdatingMinUntil = Date.now() + (Number.isFinite(minDurationMs) ? minDurationMs : 900);
                        this.setState((prevState) => {
                                const current = prevState.preview;
                                if (!current) return null;
                                if (appId && current.appId !== appId) return null;
                                if (requestId != null && current.requestId !== requestId) return null;
                                if (current.updating === true) return null;
                                return { preview: { ...current, updating: true } };
                        });
                        return;
                }

                const delay = Math.max(0, (this.previewUpdatingMinUntil || 0) - Date.now());
                if (delay > 0) {
                        const expectedAppId = appId || this.state.preview?.appId;
                        const expectedRequestId = requestId ?? this.state.preview?.requestId;
                        this.previewUpdatingTimeout = setTimeout(() => {
                                this.previewUpdatingTimeout = null;
                                this.setState((prevState) => {
                                        const current = prevState.preview;
                                        if (!current) return null;
                                        if (expectedAppId && current.appId !== expectedAppId) return null;
                                        if (expectedRequestId != null && current.requestId !== expectedRequestId) return null;
                                        if (current.updating !== true) return null;
                                        return { preview: { ...current, updating: false } };
                                });
                        }, delay);
                } else {
                        this.setState((prevState) => {
                                const current = prevState.preview;
                                if (!current) return null;
                                if (appId && current.appId !== appId) return null;
                                if (requestId != null && current.requestId !== requestId) return null;
                                if (current.updating !== true) return null;
                                return { preview: { ...current, updating: false } };
                        });
                }
        };

        startPreviewAutoRefresh = () => {
                if (typeof window === 'undefined') return;
                if (this.previewRefreshInterval) return;
                // Keep this fairly conservative to avoid hammering html-to-image.
                this.previewRefreshInterval = window.setInterval(() => {
                        const current = this.state.preview;
                        if (!current || !current.appId) return;
                        if (this.previewRefreshInFlight) return;
                        // Avoid stacking refresh requests if we're still waiting on the prior response.
                        this.previewRefreshInFlight = true;

                        const requestId = ++this.previewRequestSequence;
                        this.previewUpdatingMinUntil = Date.now() + 900;
                        this.setState((prevState) => {
                                const existing = prevState.preview;
                                if (!existing || existing.appId !== current.appId) return null;
                                return {
                                        preview: {
                                                ...existing,
                                                requestId,
                                                // Keep showing the last image while we refresh.
                                                updating: true,
                                        },
                                };
                        }, () => {
                                this.dispatchPreviewRequest(current.appId, requestId, true);
                        });
                }, 5000);
        };

        stopPreviewAutoRefresh = () => {
                if (!this.previewRefreshInterval) return;
                clearInterval(this.previewRefreshInterval);
                this.previewRefreshInterval = null;
                this.previewRefreshInFlight = false;
                this.previewUpdatingMinUntil = 0;
        };

        handlePreviewResponse = (event) => {
                const detail = event?.detail || {};
                const { appId, requestId, preview } = detail;
                if (!appId || requestId === undefined || requestId === null) {
                        return;
                }

                this.setState((prevState) => {
                        const current = prevState.preview;
                        if (!current || current.appId !== appId || current.requestId !== requestId) {
                                this.previewFocusPending = false;
                                this.previewRefreshInFlight = false;
                                return null;
                        }
                        return {
                                preview: {
                                        ...current,
                                        image: preview || null,
                                        status: preview ? 'ready' : 'empty',
                                },
                        };
                }, () => {
                        this.previewRefreshInFlight = false;
                        // If we were refreshing, keep the "Updating…" label on-screen long enough to read.
                        if (this.state.preview?.updating) {
                                this.setPreviewUpdating(false, { appId, requestId });
                        }
                        // Start the periodic refresh loop after we have an initial preview.
                        if (this.state.preview) {
                                this.startPreviewAutoRefresh();
                        }
                        if (this.previewFocusPending && this.previewFlyoutRef.current) {
                                this.previewFlyoutRef.current.focus();
                        }
                        this.previewFocusPending = false;
                });
        };

        handleDocumentKeyDown = (event) => {
                if (event.key !== 'Escape') return;
                const { preview } = this.state;
                if (!preview) return;

                const target = event?.target;
                const isNode = target && typeof target === 'object' && 'nodeType' in target;
                const previewNode = this.previewFlyoutRef.current;
                const taskbarButton = this.getTaskbarButtonElement(preview.appId);
                if (isNode) {
                        const nodeTarget = target;
                        const buttonContains = typeof taskbarButton?.contains === 'function' && taskbarButton.contains(nodeTarget);
                        if (previewNode?.contains(nodeTarget) || buttonContains) {
                                event.preventDefault();
                        }
                }

                this.hidePreview();
        };

        openPreviewForApp = (app, target, options = {}) => {
                if (!app || !target || typeof target.getBoundingClientRect !== 'function') return;
                // Only show previews for open/running applications.
                if (!this.isAppRunning(app)) return;

                const rect = target.getBoundingClientRect();
                const position = this.computePreviewPosition(rect);
                const previous = this.state.preview;
                const sameApp = previous && previous.appId === app.id;

                let status = sameApp ? previous.status : 'loading';
                let image = sameApp ? previous.image : null;
                let requestId = sameApp ? previous.requestId : null;
                let shouldRequest = false;

                if (!sameApp) {
                        shouldRequest = true;
                } else if (options.forceRefresh) {
                        shouldRequest = true;
                } else if (!image && status !== 'loading') {
                        shouldRequest = true;
                }

                if (shouldRequest) {
                        requestId = ++this.previewRequestSequence;
                        status = 'loading';
                        image = null;
                }

                this.previewFocusPending = Boolean(options.shouldFocus);
                this.clearPreviewHideTimeout();

                this.setState({
                        preview: {
                                appId: app.id,
                                appTitle: app.title,
                                position,
                                status: status || 'loading',
                                image: image || null,
                                requestId,
                                updating: false,
                        },
                }, () => {
                        if (shouldRequest) {
                                this.dispatchPreviewRequest(app.id, requestId, Boolean(options.forceRefresh));
                        } else if (this.previewFocusPending && this.previewFlyoutRef.current) {
                                this.previewFlyoutRef.current.focus();
                                this.previewFocusPending = false;
                                this.startPreviewAutoRefresh();
                        } else {
                                this.startPreviewAutoRefresh();
                        }
                });
        };

        handlePreviewMouseEnter = () => {
                this.clearPreviewHideTimeout();
        };

        handlePreviewMouseLeave = (event) => {
                const related = event?.relatedTarget;
                const currentAppId = this.state.preview?.appId;
                const taskbarButton = this.getTaskbarButtonElement(currentAppId);
                const isTaskbarTarget = typeof related?.getAttribute === 'function' && related.getAttribute('data-context') === 'taskbar';
                if (related && (this.previewFlyoutRef.current?.contains(related) || taskbarButton?.contains(related) || isTaskbarTarget)) {
                        return;
                }
                this.schedulePreviewHide();
        };

        handlePreviewFocus = () => {
                this.clearPreviewHideTimeout();
        };

        handlePreviewBlur = (event) => {
                const related = event?.relatedTarget;
                if (related) {
                        if (this.previewFlyoutRef.current?.contains(related)) {
                                return;
                        }
                        const currentAppId = this.state.preview?.appId;
                        const taskbarButton = this.getTaskbarButtonElement(currentAppId);
                        if (taskbarButton === related) {
                                return;
                        }
                }
                this.schedulePreviewHide();
        };

        handlePreviewKeyDown = (event) => {
                if (event.key === 'Escape') {
                        event.stopPropagation();
                        event.preventDefault();
                        this.hidePreview();
                }
        };

        handleRunningAppsChange = (runningApps) => {
                const { preview } = this.state;
                if (!preview) return;
                const nextApp = runningApps.find((item) => item.id === preview.appId);
                if (!nextApp) {
                        this.hidePreview();
                        return;
                }
                const button = this.getTaskbarButtonElement(preview.appId);
                if (!button) {
                        this.hidePreview();
                        return;
                }
                this.openPreviewForApp(nextApp, button, { forceRefresh: true });
        };

        handleAppButtonMouseEnter = (event, app) => {
                if (!this.isAppRunning(app)) return;
                this.openPreviewForApp(app, event.currentTarget);
        };

        handleAppButtonMouseLeave = (event) => {
                const related = event?.relatedTarget;
                const isTaskbarTarget = typeof related?.getAttribute === 'function' && related.getAttribute('data-context') === 'taskbar';
                if (related && (this.previewFlyoutRef.current?.contains(related) || isTaskbarTarget)) {
                        return;
                }
                this.schedulePreviewHide();
        };

        handleAppButtonFocus = (event, app) => {
                if (!this.isAppRunning(app)) return;
                this.openPreviewForApp(app, event.currentTarget);
        };

        handleAppButtonBlur = (event) => {
                const related = event?.relatedTarget;
                if (related && this.previewFlyoutRef.current?.contains(related)) {
                        return;
                }
                this.schedulePreviewHide();
        };

        handleWorkspaceStateUpdate = (event) => {
                const detail = event?.detail || {};
                const { workspaces, activeWorkspace } = detail;
                const nextWorkspaces = Array.isArray(workspaces) ? workspaces : [];
                const nextActiveWorkspace = typeof activeWorkspace === 'number' ? activeWorkspace : 0;
                const nextRunningApps = Array.isArray(detail.runningApps) ? detail.runningApps : [];
                const nextPinnedApps = safeParsePinnedPayload(detail.pinnedApps);

                let runningAppsChanged = false;

                this.setState((previousState) => {
                        const workspacesChanged = !areWorkspacesEqual(nextWorkspaces, previousState.workspaces);
                        const activeChanged = previousState.activeWorkspace !== nextActiveWorkspace;
                        runningAppsChanged = !areRunningAppsEqual(nextRunningApps, previousState.runningApps);
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
                }, () => {
                        if (runningAppsChanged) {
                                this.handleRunningAppsChange(nextRunningApps);
                        }
                });
        };

        dispatchTaskbarCommand = (detail) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
        };

        handleAppButtonClick = (app) => {
                this.hidePreview();
                const detail = { appId: app.id, action: 'toggle' };
                this.dispatchTaskbarCommand(detail);
        };

        handleAppButtonKeyDown = (event, app) => {
                if (event.key === 'ArrowDown') {
                        if (!this.isAppRunning(app)) return;
                        event.preventDefault();
                        this.openPreviewForApp(app, event.currentTarget, { forceRefresh: true, shouldFocus: true });
                        return;
                }
                if (event.key === 'Escape' && this.state.preview) {
                        event.preventDefault();
                        this.hidePreview();
                        return;
                }
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
                        <RunningAppsList
                                ref={this.taskbarListRef}
                                apps={visibleApps}
                                renderItem={this.renderRunningAppItem}
                                onDragOver={this.handleTaskbarDragOver}
                                onDrop={this.handleTaskbarDrop}
                        />
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
                // Filter pinned apps for mobile view (only show specific apps)
                const MOBILE_PINNED_IDS = ['youtube', 'vscode', 'about', 'settings'];
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                const visibleApps = isMobile ? pinnedApps.filter((app) => MOBILE_PINNED_IDS.includes(app.id)) : pinnedApps;

                return (
                        <PinnedAppsList
                                apps={visibleApps}
                                renderItem={this.renderPinnedAppItem}
                                onDragOver={this.handlePinnedDragOver}
                                onDrop={this.handlePinnedContainerDrop}
                        />
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

        renderAppBadge = (badge) => {
                if (!badge || typeof badge !== 'object') return null;

                const tone = resolveBadgeTone(badge.tone);
                const style = {
                        '--taskbar-badge-bg': tone.bg,
                        '--taskbar-badge-fg': tone.fg,
                        '--taskbar-badge-glow': tone.glow,
                        '--taskbar-badge-track': tone.track,
                };
                const shouldPulse = Boolean(badge.pulse);
                const classes = ['taskbar-badge'];
                if (shouldPulse) {
                        classes.push('taskbar-badge--pulse');
                }

                const resolvedLabel = typeof badge.label === 'string' && badge.label.trim()
                        ? badge.label.trim()
                        : undefined;

                if (badge.type === 'count') {
                        classes.push('taskbar-badge--count');
                        const displayValue = typeof badge.displayValue === 'string' && badge.displayValue.trim()
                                ? badge.displayValue.trim()
                                : (typeof badge.count === 'number' ? String(badge.count) : '');
                        if (!displayValue) return null;
                        const label = resolvedLabel
                                || (() => {
                                        const numeric = Number(displayValue.replace(/\D+/g, ''));
                                        if (Number.isFinite(numeric)) {
                                                return numeric === 1 ? '1 notification' : `${displayValue} notifications`;
                                        }
                                        return `${displayValue} updates`;
                                })();

                        return (
                                <span
                                        className={classes.join(' ')}
                                        style={style}
                                        role="status"
                                        aria-label={label}
                                        title={label}
                                >
                                        <span aria-hidden="true">{displayValue}</span>
                                </span>
                        );
                }

                if (badge.type === 'ring') {
                        classes.push('taskbar-badge--ring');
                        const progress = typeof badge.progress === 'number' ? Math.max(0, Math.min(1, badge.progress)) : 0;
                        style['--taskbar-badge-progress'] = `${Math.round(progress * 360)}deg`;
                        const displayValue = typeof badge.displayValue === 'string' && badge.displayValue.trim()
                                ? badge.displayValue.trim()
                                : `${Math.round(progress * 100)}%`;
                        const label = resolvedLabel || `${displayValue} complete`;

                        return (
                                <span
                                        className={classes.join(' ')}
                                        style={style}
                                        role="status"
                                        aria-label={label}
                                        title={label}
                                >
                                        <span className="taskbar-badge__value" aria-hidden="true">{displayValue}</span>
                                </span>
                        );
                }

                classes.push('taskbar-badge--dot');
                const label = resolvedLabel || 'Attention needed';

                return (
                        <span
                                className={classes.join(' ')}
                                style={style}
                                role="status"
                                aria-label={label}
                                title={label}
                        />
                );
        };

        renderTaskbarButton = (app, section) => {
                const isMinimized = Boolean(app.isMinimized);
                const isRunning = section === 'running' ? true : Boolean(app.isRunning);
                const isActive = section === 'running' ? !isMinimized : (isRunning && !isMinimized);
                const isFocused = section === 'running'
                        ? Boolean(app.isFocused && isActive)
                        : Boolean(app.isFocused && isActive);
                const badge = app && typeof app.badge === 'object' ? app.badge : null;
                const badgeNode = this.renderAppBadge(badge);
                const buttonLabel = badge?.label ? `${app.title} — ${badge.label}` : app.title;

                return (
                        <button
                                type="button"
                                aria-label={buttonLabel}
                                aria-pressed={isActive}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                onClick={() => this.handleAppButtonClick(app)}
                                onKeyDown={(event) => this.handleAppButtonKeyDown(event, app)}
                                onMouseEnter={(event) => this.handleAppButtonMouseEnter(event, app)}
                                onMouseLeave={this.handleAppButtonMouseLeave}
                                onFocus={(event) => this.handleAppButtonFocus(event, app)}
                                onBlur={this.handleAppButtonBlur}
                                className={`group/btn relative flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${isFocused ? 'bg-white/[0.12]' : 'bg-transparent hover:bg-white/[0.06]'} text-white/80 hover:text-white`}
                        >
                                <span className="relative inline-flex items-center justify-center">
                                        <Image
                                                src={app.icon}
                                                alt=""
                                                width={24}
                                                height={24}
                                                className="h-5 w-5 transition-transform duration-150 group-hover/btn:scale-105"
                                        />
                                        {badgeNode}
                                        {isActive && (
                                                <span
                                                        aria-hidden="true"
                                                        data-testid="running-indicator"
                                                        className="absolute -bottom-0.5 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-cyan-400"
                                                />
                                        )}
                                </span>
                                <span className="hidden whitespace-nowrap text-[11px] font-medium text-white/80 group-hover/btn:text-white lg:inline">{app.title}</span>
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
                        event.dataTransfer.setData('application/x-taskbar-app-id', app.id);
                        event.dataTransfer.setData('application/x-taskbar-section', 'running');
                        event.dataTransfer.setData('application/x-taskbar-app-id-legacy', `running|${app.id}`);
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
                        event.dataTransfer.setData('application/x-taskbar-app-id', app.id);
                        event.dataTransfer.setData('application/x-taskbar-section', 'pinned');
                        event.dataTransfer.setData('application/x-taskbar-app-id-legacy', `pinned|${app.id}`);
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
                        const section = transfer.getData('application/x-taskbar-section');
                        const legacy = transfer.getData('application/x-taskbar-app-id-legacy');
                        if (explicit) {
                                if (section) {
                                        return { id: explicit, section };
                                }
                                if (explicit.includes('|')) {
                                        const [legacySection, id] = explicit.split('|');
                                        return { id, section: legacySection };
                                }
                                if (legacy) {
                                        const [legacySection, id] = legacy.split('|');
                                        return { id: id || explicit, section: legacySection || 'running' };
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
                        const updated = reorderList(prevState.pinnedApps, sourceId, targetId, insertAfter);
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
                        const updated = reorderList(prevState.runningApps, sourceId, targetId, insertAfter);
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
                const { workspaces, activeWorkspace, preview } = this.state;
                const pinnedApps = this.renderPinnedApps();
                const runningApps = this.renderRunningApps();
                return (
                        <div
                                ref={this.navbarRef}
                                className="main-navbar-vp fixed inset-x-0 top-0 z-[260] flex w-full items-center justify-between border-b border-white/[0.04] bg-slate-950/75 text-ubt-grey shadow-[0_1px_3px_rgba(0,0,0,0.3)] backdrop-blur-xl"
                                role="navigation"
                                aria-label="Desktop taskbar"
                                style={{
                                        minHeight: `calc(${NAVBAR_HEIGHT}px + var(--safe-area-top, 0px))`,
                                        paddingTop: `calc(var(--safe-area-top, 0px) + 0.25rem)`,
                                        paddingBottom: '0.25rem',
                                        paddingLeft: `calc(0.5rem + var(--safe-area-left, 0px))`,
                                        paddingRight: `calc(0.5rem + var(--safe-area-right, 0px))`,
                                }}
                        >
                                <div className="flex items-center gap-1.5 text-xs md:text-sm">
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
                                </div>
                                <SystemTrayCluster
                                        statusCardOpen={this.state.status_card}
                                        onStatusToggle={this.handleStatusToggle}
                                        onStatusKeyDown={this.handleStatusKeyDown}
                                />
                                <TaskbarPreviewFlyout
                                        ref={this.previewFlyoutRef}
                                        visible={Boolean(preview)}
                                        title={preview?.appTitle}
                                        image={preview?.image}
                                        status={preview?.status}
                                        updating={preview?.updating}
                                        position={preview?.position}
                                        onMouseEnter={this.handlePreviewMouseEnter}
                                        onMouseLeave={this.handlePreviewMouseLeave}
                                        onFocus={this.handlePreviewFocus}
                                        onBlur={this.handlePreviewBlur}
                                        onKeyDown={this.handlePreviewKeyDown}
                                />
                        </div>
                );
        }


}
