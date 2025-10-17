import React, { PureComponent } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { NAVBAR_HEIGHT } from '../../utils/uiConstants';
import { areTaskbarBadgesEqual } from '../../utils/taskbarBadges';

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
                        a.isMinimized !== b.isMinimized ||
                        !areTaskbarBadgesEqual(a.badge, b.badge)
                ) {
                        return false;
                }
        }
        return true;
};

const BADGE_TONE_STYLES = {
        accent: {
                chip: 'bg-sky-500 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.35)]',
                dot: 'bg-sky-400 shadow-[0_0_0_1px_rgba(8,47,73,0.45)]',
                ring: '#38bdf8',
                track: 'rgba(8, 47, 73, 0.35)'
        },
        neutral: {
                chip: 'bg-slate-500 text-white shadow-[0_0_0_1px_rgba(100,116,139,0.45)]',
                dot: 'bg-slate-400 shadow-[0_0_0_1px_rgba(30,41,59,0.45)]',
                ring: '#94a3b8',
                track: 'rgba(30, 41, 59, 0.35)'
        },
        success: {
                chip: 'bg-emerald-500 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.35)]',
                dot: 'bg-emerald-400 shadow-[0_0_0_1px_rgba(6,95,70,0.45)]',
                ring: '#34d399',
                track: 'rgba(6, 78, 59, 0.35)'
        },
        warning: {
                chip: 'bg-amber-400 text-slate-900 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]',
                dot: 'bg-amber-300 shadow-[0_0_0_1px_rgba(113,63,18,0.35)]',
                ring: '#fbbf24',
                track: 'rgba(113, 63, 18, 0.35)'
        },
        danger: {
                chip: 'bg-rose-500 text-white shadow-[0_0_0_1px_rgba(244,63,94,0.35)]',
                dot: 'bg-rose-400 shadow-[0_0_0_1px_rgba(136,19,55,0.35)]',
                ring: '#fb7185',
                track: 'rgba(136, 19, 55, 0.35)'
        }
};

const getBadgeToneStyles = (tone) => BADGE_TONE_STYLES[tone] || BADGE_TONE_STYLES.accent;

const formatBadgeCount = (value, max = 99) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return '0';
        if (typeof max === 'number' && value > max) {
                return `${max}+`;
        }
        return `${value}`;
};

const describeBadge = (badge) => {
        if (!badge) return '';
        if (typeof badge.ariaLabel === 'string' && badge.ariaLabel.trim()) {
                return badge.ariaLabel.trim();
        }
        if (badge.variant === 'count') {
                const value = typeof badge.value === 'number' ? badge.value : 0;
                const max = typeof badge.max === 'number' ? badge.max : 99;
                if (value > max) {
                        return `More than ${max} pending items`;
                }
                const noun = value === 1 ? 'pending item' : 'pending items';
                return `${value} ${noun}`;
        }
        if (badge.variant === 'progress') {
                const percent = typeof badge.value === 'number' ? Math.round(badge.value) : 0;
                return `Progress ${percent}%`;
        }
        return 'Background activity';
};

const renderProgressRing = (badge, tone) => {
        const percent = typeof badge?.value === 'number' ? Math.max(0, Math.min(100, badge.value)) : 0;
        const stop = `${percent}%`;
        const ringColor = tone.ring || '#38bdf8';
        const trackColor = tone.track || 'rgba(15, 23, 42, 0.55)';
        return (
                <span className="pointer-events-none absolute -inset-1 flex items-center justify-center" aria-hidden="true">
                        <span
                                className="relative block h-full w-full rounded-full motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none"
                                style={{
                                        backgroundColor: trackColor,
                                        boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.35)',
                                        transform: 'translateZ(0)'
                                }}
                        >
                                <span
                                        className="absolute inset-0 rounded-full motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none"
                                        style={{
                                                background: `conic-gradient(${ringColor} ${stop}, transparent ${stop} 100%)`
                                        }}
                                />
                                <span className="absolute inset-[24%] rounded-full bg-slate-950/85" />
                        </span>
                </span>
        );
};

const renderCountBadge = (badge, tone) => (
        <span
                aria-hidden="true"
                className={`pointer-events-none absolute -top-1.5 -right-1 z-[2] inline-flex min-h-[1.25rem] min-w-[1.25rem] translate-y-0 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-semibold leading-none motion-safe:transition-[transform,background-color] motion-safe:duration-300 motion-reduce:transition-none ${tone.chip}`}
        >
                {formatBadgeCount(badge.value, badge.max)}
        </span>
);

const renderDotBadge = (tone) => (
        <span
                aria-hidden="true"
                className={`pointer-events-none absolute -top-1 -right-1 z-[2] h-2.5 w-2.5 rounded-full border border-white/40 motion-safe:transition-transform motion-safe:duration-300 motion-reduce:transition-none ${tone.dot}`}
        />
);

export default class Navbar extends PureComponent {
        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false,
                        workspaces: [],
                        activeWorkspace: 0,
                        runningApps: []
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
                const badge = app.badge;
                const tone = getBadgeToneStyles(badge?.tone);
                const badgeDescription = describeBadge(badge);
                const ariaLabel = badgeDescription ? `${app.title}, ${badgeDescription}` : app.title;
                const progressElement = badge?.variant === 'progress' ? renderProgressRing(badge, tone) : null;
                const badgeElement = badge?.variant === 'count'
                        ? renderCountBadge(badge, tone)
                        : badge?.variant === 'dot'
                                ? renderDotBadge(tone)
                                : null;

                return (
                        <button
                                type="button"
                                aria-label={ariaLabel}
                                aria-pressed={isActive}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                onClick={() => this.handleAppButtonClick(app)}
                                onKeyDown={(event) => this.handleAppButtonKeyDown(event, app)}
                                className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} relative flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                        >
                                <span className="relative inline-flex items-center justify-center">
                                        {progressElement}
                                        <Image
                                                src={app.icon}
                                                alt=""
                                                width={28}
                                                height={28}
                                                className="relative z-[1] h-6 w-6 drop-shadow-[0_1px_1px_rgba(15,23,42,0.45)]"
                                        />
                                        {badgeElement}
                                        {isActive && (
                                                <span
                                                        aria-hidden="true"
                                                        data-testid="running-indicator"
                                                        className="absolute -bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-current motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-reduce:transition-none"
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
