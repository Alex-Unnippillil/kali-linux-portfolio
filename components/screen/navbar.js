import React, { PureComponent } from 'react';
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
                                                <PerformanceGraph />
                                        </div>
                                        <div
                                                className={
                                                        'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/90 shadow-sm backdrop-blur transition duration-150 ease-in-out hover:border-white/30 hover:bg-white/10'
                                                }
                                        >
                                                <Clock onlyTime={true} showCalendar={true} hour12={false} />
                                        </div>
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
			);
		}


}
