import React, { PureComponent } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import PreviewCanvas from '../window/PreviewCanvas';
import { SettingsContext } from '../../hooks/useSettings';
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
        static contextType = SettingsContext;

        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false,
                        workspaces: [],
                        activeWorkspace: 0,
                        runningApps: [],
                        previewApp: null,
                        previewAnchor: null,
                        previewVisible: false
                };
                this.taskbarListRef = React.createRef();
                this.draggingAppId = null;
                this.pendingReorder = null;
                this.previewTimer = null;
                this.previewHideTimer = null;
                this.previewLongPressTimer = null;
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
                this.clearPreviewTimers();
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

                        let nextPreviewApp = previousState.previewApp;
                        let nextPreviewAnchor = previousState.previewAnchor;
                        let nextPreviewVisible = previousState.previewVisible;

                        if (runningAppsChanged && previousState.previewApp) {
                                const match = nextRunningApps.find((item) => item.id === previousState.previewApp.id) || null;
                                nextPreviewApp = match;
                                if (!match) {
                                        nextPreviewAnchor = null;
                                        nextPreviewVisible = false;
                                }
                        }

                        if (!workspacesChanged && !activeChanged && !runningAppsChanged) {
                                return null;
                        }

                        return {
                                workspaces: workspacesChanged ? nextWorkspaces : previousState.workspaces,
                                activeWorkspace: nextActiveWorkspace,
                                runningApps: runningAppsChanged ? nextRunningApps : previousState.runningApps,
                                previewApp: nextPreviewApp,
                                previewAnchor: nextPreviewAnchor,
                                previewVisible: nextPreviewVisible
                        };
                });
        };

        dispatchTaskbarCommand = (detail) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
        };

        handleAppButtonClick = (app) => {
                this.hidePreview(true);
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
                                onPointerEnter={(event) => this.handleAppPointerEnter(event, app)}
                                onPointerLeave={this.handleAppPointerLeave}
                                onPointerDown={(event) => this.handleAppPointerDown(event, app)}
                                onPointerUp={this.handleAppPointerUp}
                                onPointerCancel={this.handleAppPointerCancel}
                                onFocus={(event) => this.handleAppFocus(event, app)}
                                onBlur={this.handleAppBlur}
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
                this.hidePreview(true);
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

        cancelPreviewTimer = () => {
                if (this.previewTimer) {
                        clearTimeout(this.previewTimer);
                        this.previewTimer = null;
                }
        };

        cancelHideTimer = () => {
                if (this.previewHideTimer) {
                        clearTimeout(this.previewHideTimer);
                        this.previewHideTimer = null;
                }
        };

        cancelLongPressTimer = () => {
                if (this.previewLongPressTimer) {
                        clearTimeout(this.previewLongPressTimer);
                        this.previewLongPressTimer = null;
                }
        };

        clearPreviewTimers = () => {
                this.cancelPreviewTimer();
                this.cancelHideTimer();
                this.cancelLongPressTimer();
        };

        queuePreview = (app, target, delay = 180) => {
                if (!app || !target) return;
                this.cancelPreviewTimer();
                this.previewTimer = setTimeout(() => {
                        this.previewTimer = null;
                        this.showPreview(app, target);
                }, delay);
        };

        showPreview = (app, target) => {
                if (!app || !target) return;
                const rect = typeof target.getBoundingClientRect === 'function' ? target.getBoundingClientRect() : null;
                if (!rect) return;
                const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : rect.left + rect.width / 2;
                const centerX = rect.left + rect.width / 2;
                const clampedX = Math.min(Math.max(centerX, 16), viewportWidth ? viewportWidth - 16 : centerX);
                this.cancelHideTimer();
                this.setState({
                        previewApp: app,
                        previewAnchor: { x: clampedX, top: rect.top },
                        previewVisible: true
                });
        };

        hidePreview = (immediate = false) => {
                this.cancelPreviewTimer();
                this.cancelLongPressTimer();
                if (immediate) {
                        this.cancelHideTimer();
                        if (this.state.previewApp || this.state.previewAnchor || this.state.previewVisible) {
                                this.setState({ previewApp: null, previewAnchor: null, previewVisible: false });
                        }
                        return;
                }

                if (!this.state.previewApp) {
                        this.cancelHideTimer();
                        if (this.state.previewAnchor || this.state.previewVisible) {
                                this.setState({ previewApp: null, previewAnchor: null, previewVisible: false });
                        }
                        return;
                }

                this.setState({ previewVisible: false });
                this.cancelHideTimer();
                this.previewHideTimer = setTimeout(() => {
                        this.previewHideTimer = null;
                        this.setState({ previewApp: null, previewAnchor: null });
                }, 180);
        };

        handleAppPointerEnter = (event, app) => {
                if (!app || this.draggingAppId) return;
                if (event?.pointerType === 'touch') return;
                const target = event?.currentTarget;
                const delay = this.state.previewApp && this.state.previewApp.id === app.id ? 80 : 200;
                this.queuePreview(app, target, delay);
        };

        handleAppPointerLeave = () => {
                this.hidePreview();
        };

        handleAppPointerDown = (event, app) => {
                if (!app) return;
                if (event?.pointerType === 'touch') {
                        const target = event.currentTarget;
                        this.cancelLongPressTimer();
                        this.previewLongPressTimer = setTimeout(() => {
                                this.previewLongPressTimer = null;
                                this.showPreview(app, target);
                        }, 450);
                }
        };

        handleAppPointerUp = (event) => {
                if (event?.pointerType === 'touch') {
                        this.hidePreview();
                }
        };

        handleAppPointerCancel = (event) => {
                if (event?.pointerType === 'touch') {
                        this.hidePreview();
                }
        };

        handleAppFocus = (event, app) => {
                if (!app) return;
                const target = event?.currentTarget;
                if (target) {
                        this.showPreview(app, target);
                }
        };

        handleAppBlur = () => {
                this.hidePreview();
        };

        renderPreviewFallback = (app) => {
                if (!app) {
                        return (
                                <div className="flex h-full w-full items-center justify-center rounded-md bg-black/40 text-xs text-white/70">
                                        No preview available
                                </div>
                        );
                }
                return (
                        <div className="flex h-full w-full items-center justify-center rounded-md bg-white/5">
                                <Image src={app.icon} alt="" width={48} height={48} className="h-12 w-12" />
                        </div>
                );
        };

        renderTaskbarPreview = () => {
                const { previewApp, previewAnchor, previewVisible } = this.state;
                if (!previewApp || !previewAnchor) return null;
                const settings = this.context || {};
                const reducedMotion = Boolean(settings?.reducedMotion);
                const style = {
                        left: previewAnchor.x,
                        top: previewAnchor.top,
                        transform: 'translate(-50%, calc(-100% - 16px))'
                };
                const containerClass = [
                        'pointer-events-none fixed z-[280]',
                        'transition-opacity duration-150 ease-out',
                        previewVisible ? 'opacity-100' : 'opacity-0'
                ].join(' ');
                return (
                        <div className={containerClass} style={style} aria-hidden="true">
                                <div className="flex w-[min(280px,80vw)] flex-col gap-2 rounded-2xl border border-white/10 bg-[#0c1422]/95 p-3 shadow-2xl backdrop-blur">
                                        <PreviewCanvas
                                                windowId={previewApp.id}
                                                isActive={previewVisible}
                                                width={260}
                                                height={160}
                                                fallback={this.renderPreviewFallback(previewApp)}
                                                disableCapture={reducedMotion}
                                        />
                                        <div className="flex items-center gap-2 text-xs font-medium text-white/90">
                                                <Image src={previewApp.icon} alt="" width={20} height={20} className="h-5 w-5 flex-shrink-0" />
                                                <span className="truncate">{previewApp.title}</span>
                                        </div>
                                        {reducedMotion && (
                                                <p className="text-[11px] text-white/60">
                                                        Live previews are disabled to respect reduced motion settings.
                                                </p>
                                        )}
                                </div>
                        </div>
                );
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
                                <>
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
                                        {this.renderTaskbarPreview()}
                                </>
                        );
                }


}
