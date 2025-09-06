'use client';

import { useState } from 'react';

/**
 * Panel plugin that toggles visibility of all desktop windows.
 * When activated it hides every window element with the `opened-window`
 * class, storing its previous transform so that it can be restored. The
 * plugin also disables pointer events on the windows allowing drag-and-drop
 * interactions with the desktop.
 */
export default function ShowDesktop() {
  const [shown, setShown] = useState(false);
  const [dragActivated, setDragActivated] = useState(false);

  const applyState = (minimize: boolean) => {
    const windows = Array.from(
      document.querySelectorAll<HTMLElement>('.opened-window')
    );

    if (minimize) {
      windows.forEach(win => {
        win.dataset.prevTransform = win.style.transform;
        win.dataset.prevPointerEvents = win.style.pointerEvents;
        win.style.transform = 'scale(0)';
        win.style.pointerEvents = 'none';
      });
    } else {
      windows.forEach(win => {
        const { prevTransform = '', prevPointerEvents = '' } = win.dataset as {
          prevTransform?: string;
          prevPointerEvents?: string;
        };
        win.style.transform = prevTransform;
        win.style.pointerEvents = prevPointerEvents;
        delete win.dataset.prevTransform;
        delete win.dataset.prevPointerEvents;
      });
    }

    setShown(minimize);
  };

  const toggleDesktop = () => {
    applyState(!shown);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!shown) {
      setDragActivated(true);
      applyState(true);
    }
  };

  const handleDragLeave = () => {
    if (dragActivated) {
      setDragActivated(false);
      applyState(false);
    }
  };

  const handleDrop = () => {
    if (dragActivated) {
      setDragActivated(false);
      applyState(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={shown ? 'Restore windows' : 'Show desktop'}
      onClick={toggleDesktop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="p-1 rounded hover:bg-white hover:bg-opacity-10"
    >
      <span className="sr-only">{shown ? 'Restore windows' : 'Show desktop'}</span>
    </button>
  );
}

