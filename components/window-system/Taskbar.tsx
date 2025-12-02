'use client';

import React from 'react';
import { useWindowManager } from '../../state/windowManager';

export default function Taskbar() {
  const { order, windows, dispatch } = useWindowManager();
  const minimized = order.filter((identifier) => windows[identifier]?.state === 'minimized');

  const handleRestore = (windowId: string) => {
    dispatch({ type: 'UPDATE', id: windowId, update: { state: 'normal' } });
    dispatch({ type: 'FOCUS', id: windowId });
  };

  return (
    <div className="os-taskbar" role="menubar" aria-label="Taskbar">
      {minimized.map((identifier) => {
        const windowState = windows[identifier];
        return (
          <button
            key={identifier}
            type="button"
            className="os-taskbar__item"
            onClick={() => handleRestore(identifier)}
            aria-controls={identifier}
          >
            {windowState?.title}
          </button>
        );
      })}
      {!minimized.length && <span className="os-taskbar__empty">All windows are visible</span>}
    </div>
  );
}
