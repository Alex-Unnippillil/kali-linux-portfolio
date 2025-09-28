'use client';

import React, { useState } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import { useNavbarAutohide } from '../../hooks/useNavbarAutohide';
import { useSettings } from '../../hooks/useSettings';

const Navbar = () => {
  const [statusCardOpen, setStatusCardOpen] = useState(false);
  const { hidden } = useNavbarAutohide();
  const { reducedMotion } = useSettings();

  const prefersReducedMotion =
    reducedMotion ||
    (typeof document !== 'undefined' &&
      document.documentElement.classList.contains('reduced-motion'));

  const motionClasses = prefersReducedMotion
    ? ''
    : 'transition-transform duration-300 ease-in-out';
  const translateClass = hidden ? '-translate-y-full' : 'translate-y-0';

  return (
    <div
      className={`main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50 transform ${motionClasses} ${translateClass}`}
      aria-hidden={hidden}
      data-hidden={hidden ? 'true' : 'false'}
    >
      <div className="flex items-center">
        <WhiskerMenu />
        <PerformanceGraph />
      </div>
      <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1">
        <Clock />
      </div>
      <div className="flex items-center">
        <NotificationBell />
        <button
          type="button"
          id="status-bar"
          aria-label="System status"
          aria-expanded={statusCardOpen}
          onClick={() => setStatusCardOpen(prev => !prev)}
          className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1"
        >
          <Status />
          <QuickSettings open={statusCardOpen} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
