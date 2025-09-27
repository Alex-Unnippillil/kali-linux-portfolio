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
			const { status_card } = this.state;
			return (
				<div className="main-navbar-vp absolute left-0 right-0 top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center px-3 py-1 text-ubt-grey text-xs md:text-sm select-none">
					<div className="flex items-center gap-2 md:gap-3">
						<WhiskerMenu />
						<div className="hidden sm:flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.4em] text-ubt-grey/65">
							<span className="font-semibold text-ubt-grey text-opacity-90">Kali</span>
							<span className="font-light">Linux</span>
						</div>
						<PerformanceGraph />
					</div>
					<div className="flex items-center justify-center">
						<div className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.7rem] font-medium uppercase tracking-[0.35em] text-ubt-grey/80 shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
							<Clock />
						</div>
					</div>
					<div className="flex items-center justify-end gap-1.5 md:gap-2 pr-1">
						<NotificationBell />
						<button
							 type="button"
							 id="status-bar"
							 aria-label="System status"
							 onClick={() => {
								 this.setState({ status_card: !status_card });
							 }}
							 className="relative flex items-center gap-2 rounded-lg border border-transparent px-3 py-1 transition focus:border-ubb-orange focus:outline-none hover:bg-white/10"
						>
							<Status />
							<QuickSettings open={status_card} />
						</button>
					</div>
				</div>
			);
		}


}
