import React, { Component } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';

const QUICK_LAUNCHERS = [
        {
                id: 'terminal',
                icon: '/themes/Kali/panel/decompiler-symbolic.svg',
                label: 'Open Terminal',
        },
        {
                id: 'files',
                icon: '/themes/Kali/Places/folder-download.svg',
                label: 'Open Files',
        },
        {
                id: 'browser',
                icon: '/themes/Kali/panel/network-wireless-signal-good-symbolic.svg',
                label: 'Open Browser',
        },
];

export default class Navbar extends Component {
        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false
                };
        }

        handleQuickLaunch = (appId) => {
                if (typeof this.props.onQuickLaunch === 'function') {
                        this.props.onQuickLaunch(appId);
                        return;
                }
                if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                                new CustomEvent('panel:quick-launch', {
                                        detail: { appId },
                                })
                        );
                }
        };

        handleLock = () => {
                if (typeof this.props.lockScreen === 'function') {
                        this.props.lockScreen();
                }
        };

        handlePower = () => {
                if (typeof this.props.shutDown === 'function') {
                        this.props.shutDown();
                }
        };

        toggleStatus = () => {
                this.setState((prevState) => ({ status_card: !prevState.status_card }));
        };

        renderQuickLaunchers() {
                return (
                        <div className="flex items-center gap-2" aria-label="Quick launchers">
                                {QUICK_LAUNCHERS.map((launcher) => (
                                        <button
                                                key={launcher.id}
                                                type="button"
                                                onClick={() => this.handleQuickLaunch(launcher.id)}
                                                className="group flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-white/0 transition-colors duration-150 ease-out hover:border-kali-panel-border hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-panel-border/60"
                                        >
                                                <span className="sr-only">{launcher.label}</span>
                                                <Image
                                                        src={launcher.icon}
                                                        alt=""
                                                        width={20}
                                                        height={20}
                                                        className="opacity-80 transition-opacity duration-150 group-hover:opacity-100"
                                                />
                                        </button>
                                ))}
                        </div>
                );
        }

        render() {
                return (
                        <div className="main-navbar-vp fixed top-0 left-0 z-40 flex h-[var(--kali-panel-height)] w-full flex-nowrap items-center justify-between gap-4 border-b border-kali-panel-border bg-kali-panel/95 px-3 text-ubt-grey shadow-kali-panel backdrop-blur-md ring-1 ring-inset ring-kali-panel-highlight">
                                <div className="flex h-full items-center gap-4 divide-x divide-kali-panel-divider/70">
                                        <div className="flex h-full items-center px-3">
                                                <WhiskerMenu />
                                        </div>
                                        <div className="hidden h-full items-center px-3 sm:flex">
                                                {this.renderQuickLaunchers()}
                                        </div>
                                        <div className="hidden h-full items-center gap-3 px-3 lg:flex">
                                                <span className="text-[0.65rem] uppercase tracking-widest text-white/60">Workspace</span>
                                                <PerformanceGraph />
                                        </div>
                                </div>
                                <div className="flex h-full items-center gap-4">
                                        <div className="hidden items-center lg:flex">
                                                <NotificationBell />
                                        </div>
                                        <div className="relative flex h-full items-center">
                                                <button
                                                        type="button"
                                                        id="status-bar"
                                                        aria-label="System status"
                                                        aria-haspopup="dialog"
                                                        aria-expanded={this.state.status_card}
                                                        onClick={this.toggleStatus}
                                                        className="flex h-full items-center gap-3 px-3 text-xs uppercase tracking-wide text-white/70 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-panel-border/60"
                                                >
                                                        <Status />
                                                        <span className="hidden text-[0.6rem] font-semibold lg:inline">Status</span>
                                                </button>
                                                <QuickSettings open={this.state.status_card} />
                                        </div>
                                        <div className="hidden h-full items-center px-3 md:flex">
                                                <Clock />
                                        </div>
                                        <div className="flex h-full items-center gap-2 px-3">
                                                <button
                                                        type="button"
                                                        onClick={this.handleLock}
                                                        className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-white/0 text-xs font-semibold uppercase tracking-wide text-white/70 transition-colors duration-150 hover:border-kali-panel-border hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-panel-border/60"
                                                >
                                                        <span className="sr-only">Lock screen</span>
                                                        <Image src="/themes/Kali/panel/emblem-system-symbolic.svg" alt="" width={18} height={18} />
                                                </button>
                                                <button
                                                        type="button"
                                                        onClick={this.handlePower}
                                                        className="flex h-9 w-9 items-center justify-center rounded-md border border-transparent bg-kali-panel-highlight/10 text-xs font-semibold uppercase tracking-wide text-white transition-colors duration-150 hover:border-kali-panel-border hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-panel-border/60"
                                                >
                                                        <span className="sr-only">Power options</span>
                                                        <Image src="/themes/Kali/panel/power-button.svg" alt="" width={18} height={18} />
                                                </button>
                                        </div>
                                </div>
                        </div>
                );
        }
}
