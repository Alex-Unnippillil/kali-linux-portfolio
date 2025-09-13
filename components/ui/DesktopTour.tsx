"use client";

import { useEffect, useState } from 'react';
import Tour from '@rc-component/tour';
import { safeLocalStorage } from '../../utils/safeStorage';

const TOUR_KEY = 'kali:tourDone';

const DesktopTour = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (safeLocalStorage?.getItem(TOUR_KEY) !== 'true') {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (current === 0) {
      document.getElementById('whisker-menu-button')?.click();
    } else if (current === 1) {
      const status = document.getElementById('status-bar');
      if (status && !document.getElementById('qs-theme-toggle')) {
        status.click();
      }
    } else if (current === 2) {
      const status = document.getElementById('status-bar');
      if (document.getElementById('qs-theme-toggle')) {
        status?.click();
      }
      document.getElementById('whisker-menu-button')?.click();
    }
  }, [open, current]);

  const finish = () => {
    safeLocalStorage?.setItem(TOUR_KEY, 'true');
    setOpen(false);
  };

  const steps = [
    {
      title: 'Open the drawer',
      description: 'Use the Applications menu to launch apps.',
      target: () => document.getElementById('whisker-menu-button'),
    },
    {
      title: 'Switch theme',
      description: 'Toggle between light and dark modes.',
      target: () => document.getElementById('qs-theme-toggle'),
    },
    {
      title: 'Navigate workspaces',
      description: 'Press Ctrl+Super+←/→ to cycle workspaces.',
      target: () => document.getElementById('desktop'),
    },
  ];

  if (!open) return null;

  return (
    <Tour
      open
      steps={steps}
      current={current}
      onChange={setCurrent}
      onClose={finish}
      renderPanel={(props, idx) => (
        <div>
          <div className="font-bold mb-2">{props.title}</div>
          {props.description && <div className="mb-3">{props.description}</div>}
          <div className="flex justify-between">
            <button onClick={finish}>Skip</button>
            <div className="space-x-2">
              {idx > 0 && <button onClick={props.onPrev}>Prev</button>}
              <button onClick={idx === steps.length - 1 ? finish : props.onNext}>
                {idx === steps.length - 1 ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    />
  );
};

export default DesktopTour;

