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
                        <div
                                className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center text-sm select-none z-50"
                                style={{
                                        backgroundColor: 'var(--kali-overlay-medium)',
                                        color: 'var(--kali-text-strong)',
                                        backdropFilter: 'blur(12px)',
                                        borderBottom: '1px solid var(--kali-border-strong)',
                                }}
                        >
                                <WhiskerMenu />
                                <div
                                        className={
                                                'pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 focus:border-b-[color:var(--color-accent)] focus-visible:outline-none'
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
                                                'relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-b-[color:var(--color-accent)] focus-visible:outline-none py-1'
                                        }
                                >
                                        <Status />
                                        <QuickSettings open={this.state.status_card} />
                                </button>
			</div>
		);
	}
}
