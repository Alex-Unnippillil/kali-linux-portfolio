import React, { Component } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';

const APPLICATIONS_MENU = 'applications';
const STATUS_MENU = 'status';

export default class Navbar extends Component {
        constructor() {
                super();
                this.state = {
                        openMenu: null,
                        focusSearchSignal: 0
                };
        }

        componentDidMount() {
                this.handleKeyDown = (event) => {
                        if (event.key === 'Escape') {
                                this.closeMenus();
                                return;
                        }

                        if (event.repeat) return;

                        if (event.altKey && event.key === 'F1') {
                                event.preventDefault();
                                this.toggleMenu(APPLICATIONS_MENU);
                                return;
                        }

                        if (event.key === 'Meta' && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                                event.preventDefault();
                                this.toggleMenu(APPLICATIONS_MENU);
                                return;
                        }

                        if (event.altKey && event.key === 'F2') {
                                event.preventDefault();
                                this.focusApplicationsMenu();
                        }
                };

                window.addEventListener('keydown', this.handleKeyDown);
        }

        componentWillUnmount() {
                if (this.handleKeyDown) {
                        window.removeEventListener('keydown', this.handleKeyDown);
                }
        }

        toggleMenu = (menu) => {
                this.setState((prevState) => {
                        const isOpen = prevState.openMenu === menu;
                        return {
                                openMenu: isOpen ? null : menu,
                                focusSearchSignal:
                                        !isOpen && menu === APPLICATIONS_MENU
                                                ? prevState.focusSearchSignal + 1
                                                : prevState.focusSearchSignal
                        };
                });
        };

        closeMenus = () => {
                this.setState({ openMenu: null });
        };

        focusApplicationsMenu = () => {
                this.setState((prevState) => ({
                        openMenu: APPLICATIONS_MENU,
                        focusSearchSignal: prevState.focusSearchSignal + 1
                }));
        };

        render() {
                const { openMenu, focusSearchSignal } = this.state;
                const isApplicationsMenuOpen = openMenu === APPLICATIONS_MENU;
                const isStatusMenuOpen = openMenu === STATUS_MENU;

                return (
                        <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                <WhiskerMenu
                                        open={isApplicationsMenuOpen}
                                        onToggle={() => this.toggleMenu(APPLICATIONS_MENU)}
                                        onClose={this.closeMenus}
                                        focusSearchSignal={focusSearchSignal}
                                />
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
                                        onClick={() => this.toggleMenu(STATUS_MENU)}
                                        className={
                                                'relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 '
                                        }
                                >
                                        <Status />
                                        <QuickSettings open={isStatusMenuOpen} />
                                </button>
                        </div>
                );
        }
}
