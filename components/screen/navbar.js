import React, { Component } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import CalendarPopover from '../ui/CalendarPopover';

export default class Navbar extends Component {
	constructor() {
		super();
                this.state = {
                        status_card: false,
                        calendar_card: false
                };
	}

	render() {
		return (
                        <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                <div className="pl-3 pr-1">
                                        <Image src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg" alt="network icon" width={16} height={16} className="w-4 h-4" />
                                </div>
                                <WhiskerMenu />
                                <button
                                        type="button"
                                        aria-label="Show calendar"
                                        aria-haspopup="dialog"
                                        aria-expanded={this.state.calendar_card}
                                        aria-pressed={this.state.calendar_card}
                                        onClick={() => {
                                                this.setState({ calendar_card: !this.state.calendar_card });
                                        }}
                                        className="relative pl-2 pr-2 text-xs md:text-sm transition duration-100 ease-in-out border-b-2 border-transparent py-1"
                                >
                                        <Clock />
                                        <CalendarPopover open={this.state.calendar_card} />
                                </button>
                                <button
                                        type="button"
                                        id="status-bar"
                                        aria-label="System status"
                                        aria-haspopup="dialog"
                                        aria-expanded={this.state.status_card}
                                        aria-pressed={this.state.status_card}
                                        onClick={() => {
                                                this.setState({ status_card: !this.state.status_card });
                                        }}
                                        className="relative pr-3 pl-3 transition duration-100 ease-in-out border-b-2 border-transparent py-1"
                                >
                                        <Status />
                                        <QuickSettings open={this.state.status_card} />
                                </button>
			</div>
		);
	}
}
