import React, { PureComponent } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { NAVBAR_HEIGHT } from '../../utils/uiConstants';
import profile from '../../data/profile';

const areWorkspacesEqual = (next, prev) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                if (next[index] !== prev[index]) {
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
                        activeWorkspace: 0
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

                this.setState((previousState) => {
                        const workspacesChanged = !areWorkspacesEqual(nextWorkspaces, previousState.workspaces);
                        const activeChanged = previousState.activeWorkspace !== nextActiveWorkspace;

                        if (!workspacesChanged && !activeChanged) {
                                return null;
                        }

                        return {
                                workspaces: workspacesChanged ? nextWorkspaces : previousState.workspaces,
                                activeWorkspace: nextActiveWorkspace
                        };
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

                render() {
                        const { workspaces, activeWorkspace } = this.state;
                        const { name, role, avatar } = profile;

                        return (
                                <div
                                        className="main-navbar-vp fixed inset-x-0 top-0 z-50 flex h-14 w-full items-center justify-between bg-slate-950/80 px-3 text-ubt-grey shadow-lg backdrop-blur-md"
                                        style={{ minHeight: NAVBAR_HEIGHT }}
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
                                                <PerformanceGraph />
                                        </div>
                                        <div
                                                className={
                                                        'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/90 shadow-sm backdrop-blur transition duration-150 ease-in-out hover:border-white/30 hover:bg-white/10'
                                                }
                                        >
                                                <Clock onlyTime={true} showCalendar={true} hour12={false} />
                                        </div>
                                        <div className="flex items-center gap-3">
                                                <div
                                                        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white shadow-sm backdrop-blur"
                                                        aria-label={`Profile: ${name}, ${role}`}
                                                >
                                                        <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-slate-900/40">
                                                                <Image
                                                                        src={avatar}
                                                                        alt={`${name} avatar`}
                                                                        width={32}
                                                                        height={32}
                                                                        className="h-8 w-8 object-cover"
                                                                />
                                                        </div>
                                                        <div className="hidden min-w-[6rem] flex-col leading-tight sm:flex">
                                                                <span className="text-[0.7rem] font-semibold text-white">{name}</span>
                                                                <span className="text-[0.6rem] uppercase tracking-wide text-white/70">{role}</span>
                                                        </div>
                                                        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-white/80 sm:hidden">
                                                                {role}
                                                        </span>
                                                </div>
                                                <button
                                                        type="button"
                                                        id="status-bar"
                                                        aria-label="System status"
                                                        onClick={this.handleStatusToggle}
                                                        className={
                                                                'relative rounded-full border border-transparent px-3 py-1 text-xs font-medium text-white/80 transition duration-150 ease-in-out hover:border-white/20 hover:bg-white/10 focus:border-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
                                                        }
                                                >
                                                        <Status />
                                                        <QuickSettings open={this.state.status_card} />
                                                </button>
                                        </div>
                                </div>
                        );
                }


}
