'use client';

import { isBrowser } from '@/utils/env';
import React from 'react';
import ToggleSwitch from '@/components/ToggleSwitch';
import useDoNotDisturb from '@/hooks/useDoNotDisturb';

export default function NotificationsSettings() {
  const [dnd, setDnd] = useDoNotDisturb();

  const sendTest = async () => {
    if (dnd || !isBrowser()) return;
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('This is a test notification');
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('This is a test notification');
        }
      }
    }
  };

  return (
    <div className='p-4 space-y-4'>
      <div className='flex items-center justify-between'>
        <span className='text-ubt-grey'>Do Not Disturb</span>
        <ToggleSwitch
          checked={dnd}
          onChange={setDnd}
          ariaLabel='Toggle Do Not Disturb'
        />
      </div>
      <button
        onClick={sendTest}
        className='px-4 py-2 rounded bg-ubt-grey text-white'
        disabled={dnd}
      >
        Send test notification
      </button>
    </div>
  );
}

