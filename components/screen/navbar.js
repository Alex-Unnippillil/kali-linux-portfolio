import React, { Component } from 'react';
import Image from 'next/image';
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
                const panelContainerStyle = {
                        paddingInline: 'var(--panel-padding)',
                        paddingBlock: 'calc(var(--panel-padding) / 2)',
                        gap: 'var(--panel-gap)'
                };
                const panelButtonStyle = {
                        paddingInline: 'var(--panel-padding)',
                        paddingBlock: 'calc(var(--panel-padding) / 2)'
                };
                const panelIconStyle = {
                        paddingInline: 'calc(var(--panel-padding) / 2)',
                        paddingBlock: 'calc(var(--panel-padding) / 2)'
                };
                return (
                        <div
                                className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50"
                                style={panelContainerStyle}
                        >
                                <div style={panelIconStyle}>
                                        <Image src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg" alt="network icon" width={16} height={16} className="w-4 h-4" />
                                </div>
                                <WhiskerMenu />
                                <div
                                        className={
                                                'text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent'
                                        }
                                        style={panelButtonStyle}
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
                                                'relative outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange '
                                        }
                                        style={panelButtonStyle}
                                >
                                        <Status />
                                        <QuickSettings open={this.state.status_card} />
                                </button>
                        </div>
		);
	}
}
