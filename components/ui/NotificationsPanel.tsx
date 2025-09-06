import React from 'react';
import { AppNotification } from '../common/NotificationCenter';

interface Props {
  open: boolean;
  notifications: AppNotification[];
  onClose: () => void;
}

const NotificationsPanel: React.FC<Props> = ({ open, notifications, onClose }) => (
  <div
    className={`fixed top-8 right-2 w-80 max-h-96 overflow-auto bg-ub-cool-grey text-white rounded-md shadow border-black border border-opacity-20 ${open ? '' : 'hidden'}`}
  >
    <div className="flex justify-between items-center px-4 py-2 border-b border-gray-500">
      <span>Notifications</span>
      <button aria-label="Close" onClick={onClose}>
        &times;
      </button>
    </div>
    <ul className="p-2 space-y-2">
      {notifications.length === 0 && (
        <li className="text-sm text-center text-ubt-grey">No notifications</li>
      )}
      {notifications.map(n => (
        <li key={n.id} className="text-sm">
          {n.message}
        </li>
      ))}
    </ul>
  </div>
);

export default NotificationsPanel;
