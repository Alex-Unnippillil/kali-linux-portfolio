import React, { Component } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import useNotifications from '../../hooks/useNotifications';
import SettingsDialog from '../../src/components/notifications/SettingsDialog';

function NotificationsButton() {
  const { dnd, toggleDnd } = useNotifications();
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={toggleDnd}
        onContextMenu={e => {
          e.preventDefault();
          setOpen(true);
        }}
        className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1"
      >
        <span role="img" aria-label={dnd ? 'Do not disturb' : 'Notifications'}>
          {dnd ? '🔕' : '🔔'}
        </span>
      </button>
      <SettingsDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default class Navbar extends Component {
	constructor() {
		super();
		this.state = {
			status_card: false
		};
	}

	render() {
		return (
                        <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                <div className="pl-3 pr-1">
                                        <Image src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg" alt="network icon" width={16} height={16} className="w-4 h-4" />
                                </div>
                                <div
                                        className={'pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 '}
                                >
                                        <Image
                                                src="/themes/Yaru/status/decompiler-symbolic.svg"
                                                alt="Decompiler"
                                                width={16}
                                                height={16}
                                                className="inline mr-1"
                                        />
                                        Activities
                                </div>
                                <div
                                        className={
                                                'pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1'
                                        }
                                >
                                        <Clock />
                                </div>
                                <NotificationsButton />
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
