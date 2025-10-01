'use client';

import React from 'react';
import NotificationCenter from '../../components/common/NotificationCenter';
import useNotifications from '../../hooks/useNotifications';

const demoNotifications: Array<[string, string]> = [
  ['Browser', 'Download finished successfully.'],
  ['Browser', 'Bookmarks synced with cloud.'],
  ['System', 'System update ready to install.'],
  ['System', 'Nightly backup completed.'],
  ['Terminal', 'New shell session started.'],
  ['Terminal', 'Recon scan completed with no issues.'],
];

const NotificationTestControls: React.FC = () => {
  const { pushNotification, clearNotifications } = useNotifications();

  const seedDemo = () => {
    clearNotifications();
    demoNotifications.forEach(([appId, message]) => {
      pushNotification(appId, message);
    });
  };

  const addSingle = (appId: string, message: string) => {
    pushNotification(appId, message);
  };

  return (
    <section className="max-w-3xl w-full space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={seedDemo}
          className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium hover:border-white/40"
          data-testid="seed-demo"
        >
          Seed demo notifications
        </button>
        <button
          type="button"
          onClick={() => clearNotifications()}
          className="rounded-md border border-white/20 bg-transparent px-4 py-2 text-sm font-medium hover:border-white/40"
          data-testid="reset-notifications"
        >
          Reset
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {demoNotifications.slice(0, 3).map(([appId, message], index) => (
          <button
            key={`${appId}-${index}`}
            type="button"
            onClick={() => addSingle(appId, `${message} #${Math.floor(Math.random() * 90 + 10)}`)}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide hover:border-white/40"
          >
            Add {appId}
          </button>
        ))}
      </div>
      <p className="text-sm text-white/70">
        Use the controls to populate the notification center, then explore the filters with the
        arrow keys. Focus wraps between filter chips and grouped notifications.
      </p>
    </section>
  );
};

const NotificationCenterDemoPage: React.FC = () => {
  return (
    <NotificationCenter>
      <main className="min-h-screen bg-[color:var(--kali-bg)] px-4 py-10 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
          <header className="text-center space-y-2">
            <h1 className="text-3xl font-semibold">Notification Center playground</h1>
            <p className="text-sm text-white/70">
              Demo screen for keyboard traversal, filtering, and history persistence.
            </p>
          </header>
          <NotificationTestControls />
        </div>
      </main>
    </NotificationCenter>
  );
};

export default NotificationCenterDemoPage;
