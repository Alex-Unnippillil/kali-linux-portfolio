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

const clampBatteryLevel = (value) => {
        if (typeof value !== 'number' || Number.isNaN(value)) return 0;
        return Math.min(1, Math.max(0, value));
};

const createSimulatedBattery = () => {
        const level = Math.min(0.95, Math.max(0.35, Math.random() * 0.6 + 0.3));
        return {
                batteryLevel: Number(level.toFixed(2)),
                batteryCharging: Math.random() > 0.5
        };
};

const createSimulatedStatus = () => {
        const battery = createSimulatedBattery();
        return {
                online: Math.random() > 0.2,
                isOnlineSimulated: true,
                ...battery,
                isBatterySimulated: true
        };
};

export default class Navbar extends PureComponent {
        batteryManager = null;

        deviceBattery = null;

        deviceOnline = null;

        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false,
                        workspaces: [],
                        activeWorkspace: 0,
                        runningApps: [],
                        status: createSimulatedStatus(),
                        statusAnnouncement: '',
                        statusAnnouncementId: 0,
                        hasDeviceNetwork: false,
                        hasDeviceBattery: false
                };
        }

        componentDidMount() {
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                        this.initializeStatusMonitors();
                }
        }

        componentWillUnmount() {
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.removeEventListener('online', this.handleNetworkOnline);
                        window.removeEventListener('offline', this.handleNetworkOffline);
                }
                if (this.batteryManager) {
                        this.batteryManager.removeEventListener('levelchange', this.handleBatteryDeviceChange);
                        this.batteryManager.removeEventListener('chargingchange', this.handleBatteryDeviceChange);
                }
        }

        initializeStatusMonitors = () => {
                if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
                        return;
                }
                this.initializeNetworkMonitor();
                this.initializeBatteryMonitor();
        };

        initializeNetworkMonitor = () => {
                if (typeof window === 'undefined') {
                        return;
                }

                if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
                        const online = navigator.onLine;
                        this.deviceOnline = online;
                        this.setStatusState(
                                {
                                        online,
                                        isOnlineSimulated: false
                                },
                                { message: `Network ${online ? 'online' : 'offline'} (live)` }
                        );
                        this.setState((previousState) =>
                                previousState.hasDeviceNetwork ? null : { hasDeviceNetwork: true }
                        );
                }

                window.addEventListener('online', this.handleNetworkOnline);
                window.addEventListener('offline', this.handleNetworkOffline);

                if (this.deviceOnline) {
                        this.verifyNetworkConnectivity();
                }
        };

        verifyNetworkConnectivity = async () => {
                if (typeof window === 'undefined') {
                        return;
                }

                try {
                        const url = new URL('/favicon.ico', window.location.href).toString();
                        await fetch(url, { method: 'HEAD', cache: 'no-store' });
                        this.deviceOnline = true;
                        if (!this.state.status.isOnlineSimulated) {
                                this.setStatusState(
                                        {
                                                online: true,
                                                isOnlineSimulated: false
                                        },
                                        { message: 'Network verified online (live)' }
                                );
                        }
                } catch (error) {
                        this.deviceOnline = false;
                        if (!this.state.status.isOnlineSimulated) {
                                this.setStatusState(
                                        {
                                                online: false,
                                                isOnlineSimulated: false
                                        },
                                        { message: 'Network check failed (live)' }
                                );
                        }
                }
        };

        initializeBatteryMonitor = () => {
                if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') {
                        const battery = createSimulatedBattery();
                        this.setStatusState(
                                {
                                        ...battery,
                                        isBatterySimulated: true
                                },
                                { message: 'Battery status simulated' }
                        );
                        return;
                }

                navigator
                        .getBattery()
                        .then((batteryManager) => {
                                this.batteryManager = batteryManager;
                                const level = clampBatteryLevel(batteryManager.level);
                                const charging = Boolean(batteryManager.charging);
                                this.deviceBattery = { level, charging };
                                this.setStatusState(
                                        {
                                                batteryLevel: level,
                                                batteryCharging: charging,
                                                isBatterySimulated: false
                                        },
                                        {
                                                message: `Battery ${Math.round(level * 100)}% ${
                                                        charging ? 'charging' : 'on battery'
                                                } (live)`
                                        }
                                );
                                this.setState((previousState) =>
                                        previousState.hasDeviceBattery ? null : { hasDeviceBattery: true }
                                );
                                batteryManager.addEventListener('levelchange', this.handleBatteryDeviceChange);
                                batteryManager.addEventListener('chargingchange', this.handleBatteryDeviceChange);
                        })
                        .catch(() => {
                                const battery = createSimulatedBattery();
                                this.setStatusState(
                                        {
                                                ...battery,
                                                isBatterySimulated: true
                                        },
                                        { message: 'Battery status simulated' }
                                );
                        });
        };

        handleNetworkOnline = () => {
                this.deviceOnline = true;
                if (this.state.status.isOnlineSimulated) return;
                this.setStatusState(
                        {
                                online: true,
                                isOnlineSimulated: false
                        },
                        { message: 'Network online (live)' }
                );
        };

        handleNetworkOffline = () => {
                this.deviceOnline = false;
                if (this.state.status.isOnlineSimulated) return;
                this.setStatusState(
                        {
                                online: false,
                                isOnlineSimulated: false
                        },
                        { message: 'Network offline (live)' }
                );
        };

        handleBatteryDeviceChange = () => {
                if (!this.batteryManager) return;
                const level = clampBatteryLevel(this.batteryManager.level);
                const charging = Boolean(this.batteryManager.charging);
                this.deviceBattery = { level, charging };
                if (this.state.status.isBatterySimulated) return;
                this.setStatusState(
                        {
                                batteryLevel: level,
                                batteryCharging: charging,
                                isBatterySimulated: false
                        },
                        {
                                message: `Battery ${Math.round(level * 100)}% ${
                                        charging ? 'charging' : 'on battery'
                                } (live)`
                        }
                );
        };

        composeStatusAnnouncement = (previousStatus, nextStatus) => {
                const parts = [];
                if (
                        previousStatus.online !== nextStatus.online ||
                        previousStatus.isOnlineSimulated !== nextStatus.isOnlineSimulated
                ) {
                        const origin = nextStatus.isOnlineSimulated ? 'Simulated' : 'Live';
                        const label = nextStatus.online ? 'online' : 'offline';
                        parts.push(`${origin} network ${label}`);
                }

                if (
                        previousStatus.batteryLevel !== nextStatus.batteryLevel ||
                        previousStatus.batteryCharging !== nextStatus.batteryCharging ||
                        previousStatus.isBatterySimulated !== nextStatus.isBatterySimulated
                ) {
                        const origin = nextStatus.isBatterySimulated ? 'Simulated' : 'Live';
                        const percent = `${Math.round(nextStatus.batteryLevel * 100)}%`;
                        const charging = nextStatus.batteryCharging ? 'charging' : 'on battery';
                        parts.push(`${origin} battery ${percent} ${charging}`);
                }

                return parts.join('. ');
        };

        setStatusState = (nextPartial, context = {}) => {
                this.setState((previousState) => {
                        const previousStatus = previousState.status;
                        const nextStatus = { ...previousStatus, ...nextPartial };
                        const hasChanged = Object.keys(nextPartial).some(
                                (key) => previousStatus[key] !== nextStatus[key]
                        );

                        if (!hasChanged && !context.forceAnnouncement) {
                                return null;
                        }

                        const announcementParts = [];
                        if (context.message) {
                                announcementParts.push(context.message);
                        }

                        const autoAnnouncement = this.composeStatusAnnouncement(previousStatus, nextStatus);
                        if (autoAnnouncement) {
                                announcementParts.push(autoAnnouncement);
                        }

                        const statusAnnouncement = announcementParts.join('. ').trim();

                        if (!statusAnnouncement) {
                                return { status: nextStatus };
                        }

                        return {
                                status: nextStatus,
                                statusAnnouncement,
                                statusAnnouncementId: previousState.statusAnnouncementId + 1
                        };
                });
        };

        handleNetworkToggle = (nextOnline) => {
                const message = nextOnline
                        ? 'Simulated online mode enabled'
                        : 'Simulated offline mode enabled';
                this.setStatusState(
                        {
                                online: nextOnline,
                                isOnlineSimulated: true
                        },
                        { message, forceAnnouncement: true }
                );
        };

        handleUseDeviceNetwork = () => {
                if (typeof this.deviceOnline !== 'boolean') return;
                this.setStatusState(
                        {
                                online: this.deviceOnline,
                                isOnlineSimulated: false
                        },
                        {
                                message: `Using device network (${this.deviceOnline ? 'online' : 'offline'})`,
                                forceAnnouncement: true
                        }
                );
        };

        handleBatteryLevelChange = (nextLevel) => {
                const level = clampBatteryLevel(nextLevel);
                this.setStatusState(
                        {
                                batteryLevel: level,
                                isBatterySimulated: true
                        },
                        {
                                message: `Simulated battery ${Math.round(level * 100)}%`,
                                forceAnnouncement: true
                        }
                );
        };

        handleBatteryChargingChange = (nextCharging) => {
                const charging = Boolean(nextCharging);
                this.setStatusState(
                        {
                                batteryCharging: charging,
                                isBatterySimulated: true
                        },
                        {
                                message: charging
                                        ? 'Simulated charging enabled'
                                        : 'Simulated battery discharge',
                                forceAnnouncement: true
                        }
                );
        };

        handleUseDeviceBattery = () => {
                if (!this.deviceBattery) return;
                this.setStatusState(
                        {
                                batteryLevel: this.deviceBattery.level,
                                batteryCharging: this.deviceBattery.charging,
                                isBatterySimulated: false
                        },
                        {
                                message: `Using device battery (${Math.round(
                                        this.deviceBattery.level * 100
                                )}% ${this.deviceBattery.charging ? 'charging' : 'on battery'})`,
                                forceAnnouncement: true
                        }
                );
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
                        const {
                                workspaces,
                                activeWorkspace,
                                status,
                                statusAnnouncement,
                                statusAnnouncementId,
                                hasDeviceNetwork,
                                hasDeviceBattery,
                                status_card
                        } = this.state;
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
                                                        <Status
                                                                status={status}
                                                                announcement={statusAnnouncement}
                                                                announcementId={statusAnnouncementId}
                                                                onBatteryLevelChange={this.handleBatteryLevelChange}
                                                                onBatteryChargingChange={this.handleBatteryChargingChange}
                                                        />
                                                        <QuickSettings
                                                                open={status_card}
                                                                status={status}
                                                                supportsDeviceNetwork={hasDeviceNetwork}
                                                                supportsDeviceBattery={hasDeviceBattery}
                                                                onNetworkToggle={this.handleNetworkToggle}
                                                                onUseDeviceNetwork={this.handleUseDeviceNetwork}
                                                                onBatteryLevelChange={this.handleBatteryLevelChange}
                                                                onBatteryChargingChange={this.handleBatteryChargingChange}
                                                                onUseDeviceBattery={this.handleUseDeviceBattery}
                                                        />
                                                </div>
                                        </div>
                                </div>
                        );
                }


}
