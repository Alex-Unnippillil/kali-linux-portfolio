import React, { useState } from 'react';
import Image from 'next/image';
import PanelClock from '../panel/PanelClock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import usePersistentState from '../../hooks/usePersistentState';

const Navbar = () => {
  const [statusCard, setStatusCard] = useState(false);
  const [showSeconds, setShowSeconds] = usePersistentState('qs-show-seconds', false);

  return (
    <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
      <div className="pl-3 pr-1">
        <Image
          src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
          alt="network icon"
          width={16}
          height={16}
          className="w-4 h-4"
        />
      </div>
      <WhiskerMenu />
      <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1">
        <PanelClock showSeconds={showSeconds} />
      </div>
      <button
        type="button"
        id="status-bar"
        aria-label="System status"
        onClick={() => setStatusCard(!statusCard)}
        className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 "
      >
        <Status />
        <QuickSettings open={statusCard} showSeconds={showSeconds} setShowSeconds={setShowSeconds} />
      </button>
    </div>
  );
};

export default Navbar;
