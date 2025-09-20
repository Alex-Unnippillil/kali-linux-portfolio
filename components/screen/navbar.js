import React, { Component, createRef } from 'react';
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
                this.statusButtonRef = createRef();
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
                                                'pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1'
                                        }
                                >
                                        <Clock />
                                </div>
                                <div className="relative">
                                        <button
                                                ref={this.statusButtonRef}
                                                type="button"
                                                id="status-bar"
                                                aria-label="System status"
                                                aria-haspopup="dialog"
                                                aria-expanded={this.state.status_card}
                                                aria-controls="quick-settings-dialog"
                                                onClick={() => {
                                                        this.setState({ status_card: !this.state.status_card });
                                                }}
                                                className={
                                                        'pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 '
                                                }
                                        >
                                                <Status />
                                        </button>
                                        <QuickSettings
                                                open={this.state.status_card}
                                                onClose={() => this.setState({ status_card: false })}
                                                anchorRef={this.statusButtonRef}
                                        />
                                </div>
                        </div>
                );
        }
}
