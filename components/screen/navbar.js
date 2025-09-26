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
				<div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
					<div className="flex items-center">
						<WhiskerMenu />
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
