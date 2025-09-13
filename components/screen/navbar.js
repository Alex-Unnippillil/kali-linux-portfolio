"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import useScrollSpy from '../../hooks/useScrollSpy';

export default function Navbar() {
  const [statusCard, setStatusCard] = useState(false);
  const activeId = useScrollSpy(['about', 'projects', 'blog', 'contact']);

  return (
    <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
      <div className="pl-3 pr-1">
        <Image src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg" alt="network icon" width={16} height={16} className="w-4 h-4" />
      </div>
      <nav className="flex">
        <a
          href="#about"
          className={`wswitch px-1 ${activeId === 'about' ? 'text-ubt-green' : ''}`}
          aria-current={activeId === 'about' ? 'page' : undefined}
        >
          1
        </a>
        <a
          href="#projects"
          className={`wswitch px-1 ${activeId === 'projects' ? 'text-ubt-green' : ''}`}
          aria-current={activeId === 'projects' ? 'page' : undefined}
        >
          2
        </a>
        <a
          href="#blog"
          className={`wswitch px-1 ${activeId === 'blog' ? 'text-ubt-green' : ''}`}
          aria-current={activeId === 'blog' ? 'page' : undefined}
        >
          3
        </a>
        <a
          href="#contact"
          className={`wswitch px-1 ${activeId === 'contact' ? 'text-ubt-green' : ''}`}
          aria-current={activeId === 'contact' ? 'page' : undefined}
        >
          4
        </a>
      </nav>
      <WhiskerMenu />
      <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1">
        <Clock />
      </div>
      <button
        type="button"
        id="status-bar"
        aria-label="System status"
        onClick={() => setStatusCard(!statusCard)}
        className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 "
      >
        <Status />
        <QuickSettings open={statusCard} />
      </button>
    </div>
  );
}

