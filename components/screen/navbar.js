"use client";

import React, { PureComponent, useEffect, useId } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { NAVBAR_HEIGHT } from '../../utils/uiConstants';
import usePersistentState from '../../hooks/usePersistentState';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const THEME_OPTIONS = [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'high-contrast', label: 'High contrast' }
];

const isValidTheme = (value) => THEME_OPTIONS.some((option) => option.value === value);

const applyBrightness = (rawValue) => {
        if (typeof document === 'undefined') return;
        const value = clamp(Math.round(Number(rawValue) || 100), 10, 200);
        const root = document.documentElement;
        root.style.setProperty('--screen-brightness', String(value));
        root.setAttribute('data-screen-brightness', String(value));
        if (typeof window !== 'undefined') {
                window.dispatchEvent(
                        new CustomEvent('system-brightness-change', {
                                detail: { brightness: value }
                        })
                );
        }
};

const applyVolume = (rawValue) => {
        if (typeof document === 'undefined') return;
        const value = clamp(Math.round(Number(rawValue) || 0), 0, 100);
        const root = document.documentElement;
        const body = document.body;
        root.style.setProperty('--system-volume', String(value));
        root.setAttribute('data-system-volume', String(value));
        if (body) {
                body.classList.toggle('muted', value === 0);
                body.setAttribute('data-system-volume', String(value));
        }
        if (typeof window !== 'undefined') {
                window.dispatchEvent(
                        new CustomEvent('system-volume-change', {
                                detail: { volume: value }
                        })
                );
        }
};

const applyTheme = (theme) => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const nextTheme = isValidTheme(theme) ? theme : 'light';
        const isHighContrast = nextTheme === 'high-contrast';

        root.dataset.shellTheme = nextTheme;
        root.classList.toggle('high-contrast', isHighContrast);

        if (nextTheme === 'light') {
                root.setAttribute('data-theme', 'light');
        } else {
                root.setAttribute('data-theme', 'dark');
        }

        if (typeof window !== 'undefined') {
                try {
                        window.localStorage.setItem('high-contrast', isHighContrast ? 'true' : 'false');
                } catch (error) {
                        // Silently ignore storage errors
                }

                window.dispatchEvent(
                        new CustomEvent('system-theme-change', {
                                detail: { theme: nextTheme }
                        })
                );
        }
};

const QuickSettingsFlyout = ({ open }) => {
        const baseId = useId();
        const headingId = `${baseId}-heading`;
        const brightnessId = `${baseId}-brightness`;
        const volumeId = `${baseId}-volume`;
        const themeLegendId = `${baseId}-theme`; // for <fieldset>

        const [brightness, setBrightness] = usePersistentState(
                'system:brightness',
                100,
                (value) => typeof value === 'number' && Number.isFinite(value)
        );
        const [volume, setVolume] = usePersistentState(
                'system:volume',
                100,
                (value) => typeof value === 'number' && value >= 0 && value <= 100
        );
        const [theme, setTheme] = usePersistentState('system:theme', 'light', isValidTheme);

        useEffect(() => {
                applyBrightness(brightness);
        }, [brightness]);

        useEffect(() => {
                applyVolume(volume);
        }, [volume]);

        useEffect(() => {
                applyTheme(theme);
        }, [theme]);

        return (
                <div
                        role="dialog"
                        aria-modal="false"
                        aria-labelledby={headingId}
                        aria-hidden={!open}
                        className={`absolute right-3 top-9 w-72 rounded-lg border border-white/10 bg-[#101521]/95 p-4 text-xs text-white shadow-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)] md:text-sm ${
                                open
                                        ? 'pointer-events-auto opacity-100 backdrop-blur translate-y-0'
                                        : 'pointer-events-none opacity-0 -translate-y-1'
                        }`}
                        tabIndex={-1}
                >
                        <h2 id={headingId} className="text-sm font-semibold text-white">
                                Quick settings
                        </h2>
                        <div className="mt-4 flex flex-col gap-4" role="group" aria-labelledby={headingId}>
                                <div className="flex flex-col gap-2">
                                        <label htmlFor={brightnessId} className="font-medium text-white/90">
                                                Screen brightness
                                        </label>
                                        <input
                                                id={brightnessId}
                                                type="range"
                                                min="10"
                                                max="200"
                                                step="10"
                                                value={brightness}
                                                onChange={(event) => setBrightness(Number(event.target.value))}
                                                className="w-full accent-[var(--color-accent)]"
                                                aria-valuenow={brightness}
                                                aria-valuemin={10}
                                                aria-valuemax={200}
                                                aria-valuetext={`${brightness}%`}
                                                aria-label="Screen brightness"
                                        />
                                        <span className="text-[11px] text-white/60" aria-live="polite">
                                                {brightness}%
                                        </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                        <label htmlFor={volumeId} className="font-medium text-white/90">
                                                System volume
                                        </label>
                                        <input
                                                id={volumeId}
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={volume}
                                                onChange={(event) => setVolume(Number(event.target.value))}
                                                className="w-full accent-[var(--color-accent)]"
                                                aria-valuenow={volume}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-valuetext={`${volume}%`}
                                                aria-label="System volume"
                                        />
                                        <span className="text-[11px] text-white/60" aria-live="polite">
                                                {volume === 0 ? 'Muted' : `${volume}%`}
                                        </span>
                                </div>
                                <fieldset className="flex flex-col gap-2" aria-labelledby={themeLegendId}>
                                        <legend id={themeLegendId} className="font-medium text-white/90">
                                                Theme
                                        </legend>
                                        <div className="flex flex-col gap-2">
                                                {THEME_OPTIONS.map((option) => (
                                                        <label
                                                                key={option.value}
                                                                className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1 text-left hover:border-white/20 hover:bg-white/5 focus-within:border-[var(--kali-blue)] focus-within:bg-white/10"
                                                        >
                                                                <span>{option.label}</span>
                                                                <input
                                                                        type="radio"
                                                                        name={`${baseId}-theme-choice`}
                                                                        value={option.value}
                                                                        checked={theme === option.value}
                                                                        onChange={(event) => {
                                                                                if (event.target.checked) setTheme(option.value);
                                                                        }}
                                                                        aria-label={option.label}
                                                                />
                                                        </label>
                                                ))}
                                        </div>
                                </fieldset>
                        </div>
                </div>
        );
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
                        runningApps: []
                };
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
                );
        };

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
                                                        <QuickSettingsFlyout open={this.state.status_card} />
                                                </div>
                                        </div>
                                </div>
			);
		}


}
