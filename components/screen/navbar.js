import React, { Component } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';


export default class Navbar extends Component {
	constructor() {
		super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false
                };
        }

		render() {
			return (
                                <div className="main-navbar-vp absolute top-0 right-0 z-50 flex w-screen flex-nowrap items-center justify-between bg-kali-glass px-2 text-kali-accent-text-muted text-[11px] shadow-md glass-panel backdrop-blur-md select-none">
                                        <div className="flex items-center gap-2">
                                                <WhiskerMenu />
                                                <PerformanceGraph />
                                        </div>
                                        <div
                                                className={
                                                        'px-2 py-0.5 text-[11px] font-medium text-kali-accent-text-strong transition duration-100 ease-in-out'
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
                                                        'relative px-2 py-0.5 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-kali-accent-text-strong'
                                                }
                                        >
                                                <Status />
                                                <QuickSettings open={this.state.status_card} />
                                        </button>
                                </div>
			);
		}


}
