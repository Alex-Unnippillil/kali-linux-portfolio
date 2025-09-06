import React from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export type NotificationCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const SettingsDialog: React.FC = () => {
  const [timeout, setTimeoutMs] = usePersistentState<number>('notification-timeout', 3000);
  const [corner, setCorner] = usePersistentState<NotificationCorner>('notification-corner', 'top-right');

  return (
    <div>
      <label htmlFor="notification-timeout" className="block mb-2">
        Notification timeout (ms)
      </label>
      <input
        id="notification-timeout"
        name="notification-timeout"
        type="number"
        value={timeout}
        aria-label="Notification timeout (ms)"
        onChange={(e) => setTimeoutMs(Number(e.target.value))}
        className="border rounded px-2 py-1 mb-4"
      />
      <label htmlFor="notification-corner" className="block mb-2">
        Screen corner
      </label>
      <select
        id="notification-corner"
        name="notification-corner"
        value={corner}
        aria-label="Screen corner"
        onChange={(e) => setCorner(e.target.value as NotificationCorner)}
        className="border rounded px-2 py-1"
      >
        <option value="top-left">Top-left</option>
        <option value="top-right">Top-right</option>
        <option value="bottom-left">Bottom-left</option>
        <option value="bottom-right">Bottom-right</option>
      </select>
    </div>
  );
};

export default SettingsDialog;
