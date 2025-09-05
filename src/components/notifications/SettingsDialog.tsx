import React, { useState } from 'react';
import useNotifications from '../../../hooks/useNotifications';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SettingsDialog: React.FC<Props> = ({ open, onClose }) => {
  const { notifications, dnd, toggleDnd, muted, toggleApp } = useNotifications();
  const [tab, setTab] = useState<'settings' | 'log'>('settings');

  if (!open) return null;

  const appIds = Array.from(
    new Set([...Object.keys(notifications), ...Object.keys(muted)])
  );

  return (
    <div
      role="dialog"
      className="absolute bg-ub-cool-grey rounded-md py-4 top-9 right-0 shadow border-black border border-opacity-20 w-64 z-50"
    >
      <div className="flex mb-3 border-b border-gray-500">
        <button
          className={`flex-1 pb-1 ${tab === 'settings' ? 'font-bold border-b-2 border-white' : ''}`}
          onClick={() => setTab('settings')}
        >
          Settings
        </button>
        <button
          className={`flex-1 pb-1 ${tab === 'log' ? 'font-bold border-b-2 border-white' : ''}`}
          onClick={() => setTab('log')}
        >
          Log
        </button>
      </div>
      {tab === 'settings' ? (
        <div className="px-4 max-h-60 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span>Do Not Disturb</span>
            <input type="checkbox" checked={dnd} onChange={toggleDnd} />
          </div>
          {appIds.map(id => (
            <div key={id} className="flex justify-between items-center mb-1">
              <span>{id}</span>
              <input
                type="checkbox"
                checked={!muted[id]}
                onChange={() => toggleApp(id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 max-h-60 overflow-y-auto">
          {appIds.map(id => (
            <section key={id} className="mb-2">
              <h4 className="font-bold">{id}</h4>
              <ul className="pl-4 text-sm list-disc">
                {(notifications[id] ?? []).map(n => (
                  <li key={n.id}>{n.message}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end px-4">
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default SettingsDialog;
