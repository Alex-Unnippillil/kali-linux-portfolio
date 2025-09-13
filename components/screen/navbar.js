import React, { Component } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';

export default class Navbar extends Component {
	constructor() {
		super();
		this.state = {
			status_card: false
		};
	}

	render() {
		return (
                        <div className="main-navbar-vp absolute top-0 left-0 w-full h-8 shadow-md flex items-center justify-between bg-black bg-opacity-70 text-ubt-grey text-sm select-none z-50">
                                <div className="pl-2 flex items-center">
                                        <WhiskerMenu />
                                </div>
                                <div className="flex-1 text-center text-xs md:text-sm">
                                        <Clock />
                                </div>
                                <button
                                        type="button"
                                        id="status-bar"
                                        aria-label="System status"
                                        onClick={() => {
                                                this.setState({ status_card: !this.state.status_card });
                                        }}
                                        className="relative flex items-center pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1"
                                >
                                        <Status />
                                        <QuickSettings open={this.state.status_card} />
                                </button>
                        </div>
                );
        }
}
