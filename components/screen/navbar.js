import React, { Component } from 'react';
import dynamic from 'next/dynamic';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';

const loadWhiskerMenu = () => import('../menu/WhiskerMenu');
const WhiskerMenu = dynamic(loadWhiskerMenu, {
        ssr: false,
        loading: () => (
                <button
                        type="button"
                        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 opacity-70 cursor-wait"
                        aria-disabled="true"
                >
                        <span
                                aria-hidden="true"
                                className="inline-block mr-1 h-4 w-4 rounded-full bg-white bg-opacity-40 animate-pulse"
                        />
                        Applications
                </button>
        ),
});

const prefetchWhiskerMenu = () => {
        if (typeof WhiskerMenu.preload === 'function') {
                WhiskerMenu.preload();
        } else {
                loadWhiskerMenu();
        }
};

export default class Navbar extends Component {
        constructor() {
                super();
                this.state = {
                        status_card: false
                };
                this.whiskerPrefetched = false;
        }

        prefetchWhiskerMenu = () => {
                if (this.whiskerPrefetched) return;
                this.whiskerPrefetched = true;
                prefetchWhiskerMenu();
        };

        render() {
                return (
                        <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                <div
                                        onMouseEnter={this.prefetchWhiskerMenu}
                                        onFocusCapture={this.prefetchWhiskerMenu}
                                >
                                        <WhiskerMenu />
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
