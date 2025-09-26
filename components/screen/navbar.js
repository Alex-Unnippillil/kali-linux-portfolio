import React, { Component } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';

export default class Navbar extends Component {
	constructor() {
		super();
		this.state = {
			openMenu: null,
			statusCard: false
		};
		this.toggleApplicationsMenu = this.toggleApplicationsMenu.bind(this);
		this.closeMenus = this.closeMenus.bind(this);
		this.toggleStatusCard = this.toggleStatusCard.bind(this);
	}

	handleMenuToggle(menu) {
		this.setState(prevState => ({
			openMenu: prevState.openMenu === menu ? null : menu
		}));
	}

	toggleApplicationsMenu() {
		this.handleMenuToggle('applications');
	}

	closeMenus() {
		this.setState({ openMenu: null });
	}

	toggleStatusCard() {
		this.setState(prevState => ({ statusCard: !prevState.statusCard }));
	}

	render() {
		const { openMenu, statusCard } = this.state;
		return (
			<div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
				<WhiskerMenu
					isOpen={openMenu === 'applications'}
					onToggle={this.toggleApplicationsMenu}
					onClose={this.closeMenus}
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

