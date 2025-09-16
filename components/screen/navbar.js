import React, { Component } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import { transitionStyles } from '@/src/motion/presets';

const NAV_ITEM_MOTION = transitionStyles({
        properties: ['border-color', 'background-color', 'color'],
        preset: 'hover',
});

const NAV_BUTTON_MOTION = transitionStyles(
        { properties: ['border-color', 'background-color', 'color'], preset: 'hover' },
        { properties: 'transform', preset: 'tap' },
);

export default class Navbar extends Component {
	constructor() {
		super();
		this.state = {
			status_card: false
		};
	}

	render() {
		return (
                        <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                <div className="pl-3 pr-1">
                                        <Image src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg" alt="network icon" width={16} height={16} className="w-4 h-4" />
                                </div>
                                <WhiskerMenu />
                                <div
                                        className={
                                                'pl-2 pr-2 text-xs md:text-sm outline-none border-b-2 border-transparent py-1'
                                        }
                                        style={NAV_ITEM_MOTION}
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
                                                'relative pr-3 pl-3 outline-none border-b-2 border-transparent focus:border-ubb-orange py-1 '
                                        }
                                        style={NAV_BUTTON_MOTION}
                                >
                                        <Status />
                                        <QuickSettings open={this.state.status_card} />
                                </button>
			</div>
		);
	}
}
