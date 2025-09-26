import React, { Component, createRef } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import ApplicationsMenu, { toggleApplicationsMenu } from '../menu/ApplicationsMenu';

export default class Navbar extends Component {
        constructor() {
                super();
                this.state = {
                        status_card: false
                };
                this.appMenuButtonRef = createRef();
                this._uiExperiments = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';
        }

        handleApplicationsClick = () => {
                if (this._uiExperiments) {
                        toggleApplicationsMenu();
                }
        };

        render() {
                return (
                        <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                {this._uiExperiments ? (
                                        <>
                                                <button
                                                        ref={this.appMenuButtonRef}
                                                        type="button"
                                                        onClick={this.handleApplicationsClick}
                                                        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
                                                >
                                                        <Image
                                                                src="/themes/Yaru/status/decompiler-symbolic.svg"
                                                                alt="Menu"
                                                                width={16}
                                                                height={16}
                                                                className="inline mr-1"
                                                        />
                                                        Applications
                                                </button>
                                                <ApplicationsMenu anchorRef={this.appMenuButtonRef} />
                                        </>
                                ) : (
                                        <WhiskerMenu />
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
