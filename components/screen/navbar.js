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

const PREVIEW_REFRESH_INTERVAL = 500;

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
                        previewVisible: false,
                        previewAppId: null,
                        previewImage: null,
                        previewAnchor: null,
                        previewTitle: '',
                        previewAnnouncement: ''
                };

                this.previewTimer = null;
        }

        componentDidMount() {
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.addEventListener('taskbar-preview-response', this.handlePreviewResponse);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                }
        }

        componentWillUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.removeEventListener('taskbar-preview-response', this.handlePreviewResponse);
                }
                this.clearPreviewTimer();
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
                }, () => {
                        if (!this.state.previewVisible) return;
                        const stillRunning = nextRunningApps.some(
                                (app) => app.id === this.state.previewAppId && app.isMinimized === false
                        );
                        if (!stillRunning) {
                                this.stopPreview();
                        }
                });
        };

        dispatchTaskbarCommand = (detail) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
        };

        clearPreviewTimer = () => {
                if (this.previewTimer) {
                        clearInterval(this.previewTimer);
                        this.previewTimer = null;
                }
        };

        requestPreview = (windowId) => {
                if (typeof window === 'undefined' || !windowId) return;
                window.dispatchEvent(new CustomEvent('taskbar-preview-request', { detail: { windowId } }));
        };

        handlePreviewResponse = (event) => {
                const detail = event?.detail || {};
                const windowId = detail.windowId;
                const image = detail.image || null;
                this.setState((previousState) => {
                        if (!previousState.previewVisible || previousState.previewAppId !== windowId) {
                                return null;
                        }
                        if (previousState.previewImage === image) {
                                return null;
                        }
                        const now = new Date().toLocaleTimeString();
                        const message = image
                                ? `Preview refreshed for ${previousState.previewTitle} at ${now}`
                                : `Preview unavailable for ${previousState.previewTitle} at ${now}`;
                        return {
                                previewImage: image,
                                previewAnnouncement: message,
                        };
                });
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

        handleAppButtonEnter = (event, app) => {
                if (!app || app.isMinimized) return;
                const target = event?.currentTarget;
                const rect = typeof target?.getBoundingClientRect === 'function'
                        ? target.getBoundingClientRect()
                        : null;
                const anchor = rect
                        ? {
                                top: rect.bottom + 8,
                                left: rect.left + rect.width / 2,
                        }
                        : null;
                const keepImage = this.state.previewVisible && this.state.previewAppId === app.id
                        ? this.state.previewImage
                        : null;

                this.clearPreviewTimer();
                this.setState({
                        previewVisible: true,
                        previewAppId: app.id,
                        previewAnchor: anchor,
                        previewTitle: app.title,
                        previewImage: keepImage,
                        previewAnnouncement: `Preview opened for ${app.title} at ${new Date().toLocaleTimeString()}`,
                }, () => {
                        this.requestPreview(app.id);
                        if (typeof window !== 'undefined') {
                                this.previewTimer = window.setInterval(
                                        () => this.requestPreview(app.id),
                                        PREVIEW_REFRESH_INTERVAL
                                );
                        }
                });
        };

        stopPreview = () => {
                if (!this.state.previewVisible) return;
                const title = this.state.previewTitle;
                this.clearPreviewTimer();
                this.setState({
                        previewVisible: false,
                        previewAppId: null,
                        previewAnchor: null,
                        previewImage: null,
                        previewAnnouncement: title
                                ? `Preview closed for ${title} at ${new Date().toLocaleTimeString()}`
                                : `Preview closed at ${new Date().toLocaleTimeString()}`,
                });
        };

        handleAppButtonLeave = () => {
                this.stopPreview();
        };

        renderPreviewPopover = () => {
                const { previewVisible, previewAnchor, previewImage, previewTitle } = this.state;
                if (!previewVisible || !previewAnchor) return null;

                return (
                        <div
                                id="taskbar-preview-popover"
                                role="dialog"
                                aria-label={`${previewTitle} window preview`}
                                className="pointer-events-none fixed z-[60] mt-2 max-w-[18rem] -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-md"
                                style={{ top: previewAnchor.top, left: previewAnchor.left }}
                        >
                                <p className="mb-2 text-xs font-medium text-white/80">{previewTitle}</p>
                                <div className="flex h-32 w-48 max-w-full items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/60">
                                        {previewImage ? (
                                                <img
                                                        src={previewImage}
                                                        alt={`Live preview of ${previewTitle}`}
                                                        className="h-full w-full object-contain"
                                                />
                                        ) : (
                                                <span className="text-xs text-white/60">Preview unavailable</span>
                                        )}
                                </div>
                        </div>
                );
        };

        renderRunningApps = () => {
                const { runningApps } = this.state;
                if (!runningApps.length) return null;

                return (
                        <>
                                <ul
                                        className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                        role="list"
                                        aria-label="Open applications"
                                >
                                        {runningApps.map((app) => (
                                                <li key={app.id} className="flex">
                                                        {this.renderRunningAppButton(app)}
                                                </li>
                                        ))}
                                </ul>
                                {this.renderPreviewPopover()}
                        </>
                );
        };

        renderRunningAppButton = (app) => {
                const isActive = !app.isMinimized;
                const isFocused = app.isFocused && isActive;
                const { previewVisible, previewAppId } = this.state;
                const describedBy = previewVisible && previewAppId === app.id ? 'taskbar-preview-popover' : undefined;

                return (
                        <button
                                type="button"
                                aria-label={app.title}
                                aria-pressed={isActive}
                                aria-describedby={describedBy}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                onClick={() => this.handleAppButtonClick(app)}
                                onKeyDown={(event) => this.handleAppButtonKeyDown(event, app)}
                                onMouseEnter={(event) => this.handleAppButtonEnter(event, app)}
                                onMouseLeave={this.handleAppButtonLeave}
                                onFocus={(event) => this.handleAppButtonEnter(event, app)}
                                onBlur={this.handleAppButtonLeave}
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
                                        className="main-navbar-vp fixed inset-x-0 top-0 z-50 flex w-full items-center justify-between bg-slate-950/80 text-ubt-grey shadow-lg backdrop-blur-md"
                                        style={{
                                                minHeight: `calc(${NAVBAR_HEIGHT}px + var(--safe-area-top, 0px))`,
                                                paddingTop: `calc(var(--safe-area-top, 0px) + 0.5rem)`,
                                                paddingBottom: '0.5rem',
                                                paddingLeft: `calc(0.75rem + var(--safe-area-left, 0px))`,
                                                paddingRight: `calc(0.75rem + var(--safe-area-right, 0px))`,
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
                                        <div className="sr-only" aria-live="polite">
                                                {this.state.previewAnnouncement}
                                        </div>
                                </div>
                        );
                }


}
