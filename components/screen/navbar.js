'use client';

import React, { Component } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PlacesMenu from '../menu/PlacesMenu';

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
                                <button
                                        type="button"
                                        aria-haspopup="true"
                                        aria-expanded={this.state.applicationsMenuOpen}
                                        onClick={() =>
                                                this.setState((prevState) => ({
                                                        applicationsMenuOpen: !prevState.applicationsMenuOpen,
                                                        placesMenuOpen: false
                                                }))
                                        }
                                        className="px-3 h-8 flex items-center hover:bg-kali-menu-hover focus-ring"
                                >
                                        Applications
                                </button>
                                <button
                                        type="button"
                                        aria-haspopup="true"
                                        aria-expanded={this.state.placesMenuOpen}
                                        onClick={() =>
                                                this.setState((prevState) => ({
                                                        placesMenuOpen: !prevState.placesMenuOpen,
                                                        applicationsMenuOpen: false
                                                }))
                                        }
                                        className="px-3 h-8 flex items-center hover:bg-kali-menu-hover focus-ring"
                                >
                                        Places
                                </button>
                                <WhiskerMenu />
                                <PlacesMenu />
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
