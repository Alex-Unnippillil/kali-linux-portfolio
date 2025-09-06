"use client";

import { useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import usePersistentState from '../../hooks/usePersistentState';

/**
 * Top panel showing network status, activities, clock and system menu.
 *
 * The layout previously relied on a single row flex container which made it
 * difficult to support multi-row configurations or vertical orientations. This
 * component now uses CSS grid so the number of rows and layout direction can be
 * customised through persisted settings.
 */
export default function Navbar() {
  const [statusCard, setStatusCard] = useState(false);

  // Persisted preference for number of panel rows. Defaults to a single row.
  const [rows] = usePersistentState('app:panel-rows', 1);
  // Orientation of the panel – 'horizontal' for top/bottom panels or 'vertical'
  // for side panels. Currently only the horizontal orientation is exposed via
  // the UI but the layout is prepared for future expansion.
  const [orientation] = usePersistentState('app:panel-orientation', 'horizontal');

  const gridClasses = orientation === 'vertical' ? 'grid grid-flow-row auto-cols-max' : 'grid grid-flow-col auto-rows-min';
  const style =
    orientation === 'vertical'
      ? { gridTemplateColumns: `repeat(${rows}, minmax(0,1fr))` }
      : { gridTemplateRows: `repeat(${rows}, auto)` };

  return (
    <div
      className={`main-navbar-vp absolute top-0 right-0 w-screen shadow-md bg-ub-grey text-ubt-grey text-sm select-none z-50 ${gridClasses}`}
      style={style}
    >
      <div className="pl-3 pr-1 place-self-center">
        <Image
          src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
          alt="network icon"
          width={16}
          height={16}
          className="w-4 h-4"
        />
      </div>
      <div className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 place-self-center">
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt="Decompiler"
          width={16}
          height={16}
          className="inline mr-1"
        />
        Activities
      </div>
      <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1 place-self-center">
        <Clock />
      </div>
      <button
        type="button"
        id="status-bar"
        aria-label="System status"
        onClick={() => setStatusCard(!statusCard)}
        className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 place-self-center"
      >
        <Status />
        <QuickSettings open={statusCard} />
      </button>
    </div>
  );
}

