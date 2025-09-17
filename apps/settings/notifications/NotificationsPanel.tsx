"use client";

import React, { useMemo } from 'react';
import ToggleSwitch from '../../../components/ToggleSwitch';
import useNotifications from '../../../hooks/useNotifications';

const formatPendingCopy = (count: number) => {
  if (count === 0) return 'No pending notifications.';
  if (count === 1) return '1 notification is waiting.';
  return `${count} notifications are waiting.`;
};

const NotificationsPanel: React.FC = () => {
  const { doNotDisturb, setDoNotDisturb, indicator, notifications, clearNotifications } =
    useNotifications();

  const pending = useMemo(
    () =>
      Object.entries(notifications)
        .map(([appId, list]) => ({
          appId,
          count: list.length,
          latest: list[list.length - 1]?.date ?? null,
        }))
        .filter(item => item.count > 0),
    [notifications],
  );

  const totalPending = useMemo(
    () => pending.reduce((sum, item) => sum + item.count, 0),
    [pending],
  );

  const statusCopy = doNotDisturb
    ? indicator === 'muted' && totalPending > 0
      ? 'Notifications are paused. They will appear when Do Not Disturb is turned off.'
      : 'Notifications are silenced until you turn this off.'
    : totalPending > 0
    ? 'Notifications will appear with alerts.'
    : 'You will be notified when new events arrive.';

  return (
    <div className="px-4 py-6 space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Do Not Disturb</h2>
          <p className="text-sm text-ubt-grey">
            Pause banners and sounds when you need to focus. You can still review queued
            messages below.
          </p>
        </div>
        <ToggleSwitch
          checked={doNotDisturb}
          onChange={(value) => setDoNotDisturb(value)}
          ariaLabel="Toggle Do Not Disturb"
        />
      </section>

      <section className="rounded-md border border-gray-900 bg-black bg-opacity-30 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ubt-grey">Status</span>
          <span className="text-white">{doNotDisturb ? 'On' : 'Off'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ubt-grey">Pending notifications</span>
          <span className="text-white">{totalPending}</span>
        </div>
        <p className="text-xs text-ubt-grey">{statusCopy}</p>
        {totalPending > 0 && (
          <button
            type="button"
            onClick={() => clearNotifications()}
            className="text-xs font-medium text-ub-orange hover:underline focus:outline-none"
          >
            Clear all notifications
          </button>
        )}
      </section>

      <section className="rounded-md border border-gray-900 bg-black bg-opacity-20">
        <header className="border-b border-gray-900 px-4 py-2 text-sm font-semibold text-white">
          Queued per app
        </header>
        {pending.length === 0 ? (
          <p className="px-4 py-4 text-sm text-ubt-grey">{formatPendingCopy(0)}</p>
        ) : (
          <ul className="divide-y divide-gray-900">
            {pending.map(({ appId, count, latest }) => (
              <li key={appId} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-white">{appId}</span>
                  {latest && (
                    <span className="text-xs text-ubt-grey">
                      Last message at {new Date(latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <span className="text-white">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default NotificationsPanel;
