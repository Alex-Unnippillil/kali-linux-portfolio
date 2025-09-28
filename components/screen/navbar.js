import React, { Component } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import PlacesDropdown from '../menu/PlacesDropdown';

const BASE_PLACES = [
        { id: 'home', label: 'Home', icon: '/themes/Kali/places/user-home.svg', path: 'home/kali' },
        { id: 'desktop', label: 'Desktop', icon: '/themes/Kali/places/user-desktop.svg', path: 'home/kali/Desktop' },
        { id: 'documents', label: 'Documents', icon: '/themes/Kali/places/folder-documents.svg', path: 'home/kali/Documents' },
        { id: 'downloads', label: 'Downloads', icon: '/themes/Kali/places/folder-downloads.svg', path: 'home/kali/Downloads' },
        { id: 'pictures', label: 'Pictures', icon: '/themes/Kali/places/folder-pictures.svg', path: 'home/kali/Pictures' },
        { id: 'videos', label: 'Videos', icon: '/themes/Kali/places/folder-videos.svg', path: 'home/kali/Videos' }
];


export default class Navbar extends Component {
        constructor() {
                super();
                this.state = {
                        openMenu: null,
                        statusCard: false
                };
                this.placesMenuItems = BASE_PLACES.map((item) => ({
                        id: item.id,
                        label: item.label,
                        icon: item.icon,
                        onSelect: () => this.openPlace(item.path)
                }));
        }

        openPlace = (path) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('open-app', { detail: { id: 'files', path } }));
        };

        handleMenuOpenChange = (menu, isOpen) => {
                this.setState((prev) => {
                        if (isOpen) {
                                const nextState = { openMenu: menu };
                                if (prev.statusCard) {
                                        nextState.statusCard = false;
                                }
                                return nextState;
                        }
                        if (prev.openMenu === menu) {
                                return { openMenu: null };
                        }
                        return null;
                });
        };

        toggleStatusCard = () => {
                this.setState((prev) => ({
                        statusCard: !prev.statusCard,
                        openMenu: null
                }));
        };

                render() {
                        const { openMenu, statusCard } = this.state;
                        return (
                                <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                        <div className="flex items-center">
                                                <WhiskerMenu
                                                        className="mr-1"
                                                        isOpen={openMenu === 'applications'}
                                                        onOpenChange={(isOpen) => this.handleMenuOpenChange('applications', isOpen)}
                                                />
                                                <PlacesDropdown
                                                        className="mr-2"
                                                        isOpen={openMenu === 'places'}
                                                        onOpenChange={(isOpen) => this.handleMenuOpenChange('places', isOpen)}
                                                        items={this.placesMenuItems}
                                                />
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
                                                aria-expanded={statusCard}
                                                onClick={this.toggleStatusCard}
                                                className={
                                                        'relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 '
                                                }
                                        >
                                                <Status />
                                                <QuickSettings open={statusCard} />
                                        </button>
                                </div>
                        );
                }


}
