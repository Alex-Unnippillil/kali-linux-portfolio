import React, { Component } from 'react';
import dynamic from 'next/dynamic';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';

const ApplicationsMenu = dynamic(
        () => import('../menu/ApplicationsMenu'),
        {
                ssr: false,
                loading: () => (
                        <button
                                type="button"
                                className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 opacity-60"
                                disabled
                        >
                                Applications
                        </button>
                ),
        }
);

const PlacesMenu = dynamic(
        () => import('../panel/PlacesMenu'),
        {
                ssr: false,
                loading: () => (
                        <span className="pl-3 pr-3 py-1 text-ubt-grey text-sm opacity-70">Places</span>
                ),
        }
);

export default class Navbar extends Component {
        constructor(props) {
                super(props);
                this.state = {
                        status_card: false
                };
                this.useWhiskerMenu = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        }

        render() {
                return (
                        <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                {this.useWhiskerMenu ? (
                                        <WhiskerMenu />
                                ) : (
                                        <div className="flex items-center space-x-1">
                                                <ApplicationsMenu />
                                                <PlacesMenu openApp={this.props.openApp} />
                                        </div>
                                )}
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
