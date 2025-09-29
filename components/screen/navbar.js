import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';

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
        static propTypes = {
                statusBarRef: PropTypes.oneOfType([
                        PropTypes.func,
                        PropTypes.shape({ current: PropTypes.any })
                ])
        };

        static defaultProps = {
                statusBarRef: null
        };

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
                        const { statusBarRef } = this.props;
                        return (
                                <div className="main-navbar-vp absolute top-0 right-0 z-50 flex w-screen items-center justify-between bg-slate-950/80 px-3 py-2 text-ubt-grey shadow-lg backdrop-blur-md">
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
                                        <button
                                                type="button"
                                                id="status-bar"
                                                aria-label="System status"
                                                onClick={this.handleStatusToggle}
                                                ref={statusBarRef}
                                                className={
                                                        'relative rounded-full border border-transparent px-3 py-1 text-xs font-medium text-white/80 transition duration-150 ease-in-out hover:border-white/20 hover:bg-white/10 focus:border-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
                                                }
                                        >
                                                <Status />
                                                <QuickSettings open={this.state.status_card} />
                                        </button>
				</div>
			);
		}


}
