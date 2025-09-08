"use client";

import { useState } from 'react';
import type { JSX } from 'react';
import Modal from '@/components/base/Modal';

type Action = 'lock' | 'logout' | 'suspend' | 'restart' | 'shutdown';

const labels: Record<Action, string> = {
  lock: 'Lock',
  logout: 'Log out',
  suspend: 'Suspend',
  restart: 'Restart',
  shutdown: 'Shutdown'
};

const icons: Record<Action, JSX.Element> = {
  lock: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  logout: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  ),
  suspend: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  restart: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  shutdown: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
    </svg>
  )
};

const ActionButtons: React.FC = () => {
  const [current, setCurrent] = useState<Action | null>(null);

  return (
    <div className="flex gap-2">
      {(Object.keys(labels) as Action[]).map((action) => (
        <button
          key={action}
          aria-label={labels[action]}
          onClick={() => setCurrent(action)}
          className="p-2 rounded hover:bg-gray-700"
        >
          {icons[action]}
        </button>
      ))}
      <Modal isOpen={current !== null} onClose={() => setCurrent(null)}>
        <div className="fixed inset-0 flex items-center justify-center bg-black/70">
          <div className="w-64 rounded bg-gray-800 p-4 text-center text-white">
            <p className="mb-4">Confirm {current ? labels[current] : ''}?</p>
            <div className="flex justify-end gap-2">
              <button
                className="w-[90px] rounded bg-gray-600 px-2 py-1"
                onClick={() => setCurrent(null)}
              >
                Cancel
              </button>
              <button
                className="w-[90px] rounded bg-blue-600 px-2 py-1"
                onClick={() => setCurrent(null)}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ActionButtons;
