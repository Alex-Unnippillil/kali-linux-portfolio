import React, { useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import { useSettings } from '../../hooks/useSettings';

export default function Navbar() {
  const [statusCard, setStatusCard] = useState(false);
  const { theme } = useSettings();
  const iconTheme = theme === 'undercover' ? 'Undercover' : 'Yaru';
  return (
    <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
      <div className="pl-3 pr-1">
        <Image
          src={`/themes/${iconTheme}/status/network-wireless-signal-good-symbolic.svg`}
          alt="network icon"
          width={16}
          height={16}
          className="w-4 h-4"
        />
      </div>
      <div className={'pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 '}>
        <Image
          src={`/themes/${iconTheme}/${theme === 'undercover' ? 'start-menu-symbolic.svg' : 'status/decompiler-symbolic.svg'}`}
          alt={theme === 'undercover' ? 'Start' : 'Decompiler'}
          width={16}
          height={16}
          className="inline mr-1"
        />
        {theme === 'undercover' ? 'Start' : 'Activities'}
      </div>
      <div
        className={'pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1'}
      >
        <Clock />
      </div>
      <button
        type="button"
        id="status-bar"
        aria-label="System status"
        onClick={() => {
          setStatusCard(!statusCard);
        }}
        className={'relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 '}
      >
        <Status />
        <QuickSettings open={statusCard} />
      </button>
    </div>
  );
}
