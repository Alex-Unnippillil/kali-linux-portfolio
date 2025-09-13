import React, { Component } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PanelClock from '../util-components/PanelClock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import HelpMenu from '../menu/HelpMenu';
import { getUndercover, setUndercover } from '../../utils/theme';

export default class Navbar extends Component {
  constructor() {
    super();
    this.state = {
      status_card: false,
      undercover: getUndercover(),
      showTip: false,
    };
  }

  componentDidMount() {
    setUndercover(this.state.undercover);
  }

  render() {
    const toggleUndercover = () => {
      const next = !this.state.undercover;
      setUndercover(next);
      this.setState({ undercover: next });
    };

    return (
      <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
        <div className="pl-3 pr-1">
          <Image
            src={
              this.state.undercover
                ? '/themes/Undercover/status/network.svg'
                : '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg'
            }
            alt="network icon"
            width={16}
            height={16}
            className="w-4 h-4"
          />
        </div>
        <WhiskerMenu />
        <HelpMenu />
        <button
          type="button"
          aria-label="Undercover mode"
          onClick={toggleUndercover}
          onMouseEnter={() => this.setState({ showTip: true })}
          onMouseLeave={() => this.setState({ showTip: false })}
          className="relative p-2"
        >
          <Image
            src="/themes/Undercover/system/undercover.svg"
            alt="undercover toggle"
            width={16}
            height={16}
          />
          {this.state.showTip && (
            <div
              role="tooltip"
              className="absolute right-0 mt-1 w-48 p-2 text-xs text-white bg-black rounded shadow-lg"
            >
              Undercover mode – Windows-like theme.{' '}
              <Link href="/undercover" className="underline text-blue-300">
                Read disclaimer
              </Link>
            </div>
          )}
        </button>
        <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1">
          <PanelClock />
        </div>
        <button
          type="button"
          id="status-bar"
          aria-label="System status"
          onClick={() => {
            this.setState({ status_card: !this.state.status_card });
          }}
          className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 "
        >
          <Status />
          <QuickSettings
            open={this.state.status_card}
            lockScreen={this.props.lockScreen}
            logOut={this.props.logOut}
          />
        </button>
      </div>
    );
  }
}
