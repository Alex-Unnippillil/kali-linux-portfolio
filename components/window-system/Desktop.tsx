'use client';

import React, { useEffect, useRef } from 'react';
import { WindowManagerProvider, useWindowManager } from '../../state/windowManager';
import Window from './Window';
import Taskbar from './Taskbar';
import '../../styles/window-system.css';

function DesktopInner() {
  const { order, openInitial } = useWindowManager();
  const desktopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    openInitial();
  }, [openInitial]);

  return (
    <div ref={desktopRef} className="os-desktop" id="os-desktop" role="presentation">
      {order.map((id) => (
        <Window key={id} id={id} desktopRef={desktopRef} />
      ))}
      <Taskbar />
    </div>
  );
}

export default function Desktop() {
  return (
    <WindowManagerProvider>
      <DesktopInner />
    </WindowManagerProvider>
  );
}
