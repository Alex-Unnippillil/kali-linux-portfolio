import React, { Component } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';

export default class Navbar extends Component {
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
                this.setState({
                        workspaces: Array.isArray(workspaces) ? workspaces : [],
                        activeWorkspace: typeof activeWorkspace === 'number' ? activeWorkspace : 0
                });
        };

        handleWorkspaceSelect = (workspaceId) => {
                if (typeof workspaceId !== 'number') return;
                this.setState({ activeWorkspace: workspaceId });
                if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('workspace-select', { detail: { workspaceId } }));
                }
        };

                render() {
                        const { workspaces, activeWorkspace } = this.state;
                        return (
                                <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                        <div className="flex items-center gap-2">
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
							'pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1'
						}
					>
						<Clock />
					</div>
					<button
						type="button"
						id="status-bar"
						aria-label="System status"
						onClick={() => {
							this.setState({ status_card: !this.state.status_card });
						}}
						className={
							'relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 '
						}
					>
						<Status />
						<QuickSettings open={this.state.status_card} />
					</button>
				</div>
			);
		}


}
