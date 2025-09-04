import React, { useMemo, useState } from 'react';
import useNotifications from '../../hooks/useNotifications';

const BellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path d="M12 24a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6.364-6V11a6.364 6.364 0 1 0-12.728 0v7L3 20h18l-2.636-2z" />
  </svg>
);

const NotificationBell: React.FC = () => {
  const { notifications, doNotDisturb, toggleDoNotDisturb } = useNotifications();
  const [open, setOpen] = useState(false);

  const totalCount = useMemo(
    () => Object.values(notifications).reduce((sum, list) => sum + list.length, 0),
    [notifications]
  );

  const allNotifications = useMemo(
    () =>
      Object.entries(notifications)
        .flatMap(([appId, list]) =>
          list.map(n => ({ ...n, appId }))
        )
        .sort((a, b) => b.date - a.date),
    [notifications]
  );

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
        className="relative px-2 py-1 hover:bg-black hover:bg-opacity-20 rounded"
      >
        <BellIcon />
        {totalCount > 0 && (
          <span className="absolute -top-0 -right-0 bg-red-600 rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-ub-grey text-white rounded shadow-lg z-50 p-2 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Notifications</span>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={doNotDisturb}
                onChange={toggleDoNotDisturb}
              />
              DND
            </label>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {allNotifications.length === 0 && (
              <li className="text-center text-ubt-grey py-2">No notifications</li>
            )}
            {allNotifications.map(n => (
              <li
                key={n.id}
                className="border-b border-ubt-grey border-opacity-20 py-1 last:border-0"
              >
                <div className="text-ubt-grey text-[10px]">{n.appId}</div>
                {n.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
