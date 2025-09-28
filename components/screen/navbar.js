import React, { Component, createRef } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import ApplicationsMenu, {
        closeApplicationsMenu,
        subscribeToApplicationsMenu,
        toggleApplicationsMenu,
} from '../menu/ApplicationsMenu';

const ENABLE_APPLICATIONS_MENU = process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';


export default class Navbar extends Component {
        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false
                };
                this.applicationsButtonRef = createRef();
        }

        componentDidMount() {
                if (!ENABLE_APPLICATIONS_MENU) return;
                this.unsubscribeApplicationsMenu = subscribeToApplicationsMenu((isOpen) => {
                        this.setState({ applicationsMenuOpen: isOpen });
                });
        }

        componentWillUnmount() {
                if (this.unsubscribeApplicationsMenu) {
                        this.unsubscribeApplicationsMenu();
                }
        }

                render() {
                        return (
                                <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                        <div className="flex items-center">
                                                {ENABLE_APPLICATIONS_MENU ? (
                                                        <div className="relative inline-flex">
                                                                <button
                                                                        type="button"
                                                                        ref={this.applicationsButtonRef}
                                                                        onClick={() => {
                                                                                toggleApplicationsMenu();
                                                                        }}
                                                                        className={
                                                                                (this.state.applicationsMenuOpen ? 'bg-gray-700 text-white ' : '') +
                                                                                'pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 hover:bg-gray-700/70 focus:border-ubb-orange'
                                                                        }
                                                                >
                                                                        <img
                                                                                src="/themes/Yaru/status/decompiler-symbolic.svg"
                                                                                alt="Applications"
                                                                                className="mr-1 inline h-4 w-4"
                                                                        />
                                                                        Applications
                                                                </button>
                                                                <ApplicationsMenu anchorRef={this.applicationsButtonRef} />
                                                        </div>
                                                ) : (
                                                        <WhiskerMenu />
                                                )}
                                                <PerformanceGraph />
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
                                                        if (ENABLE_APPLICATIONS_MENU) {
                                                                closeApplicationsMenu();
                                                        }
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
