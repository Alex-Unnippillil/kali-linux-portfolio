'use client';

import React from 'react';
import NotificationCenter from '../../components/common/NotificationCenter';
import NetworkInsights from './components/NetworkInsights';

export default function ResourceMonitorApp() {
  return (
    <div className="h-full w-full bg-ub-cool-grey overflow-auto">
      <NotificationCenter
        className="px-2 text-white"
        emptyMessage="No alerts routed yet."
        title="Routed alerts"
      >
        <NetworkInsights />
      </NotificationCenter>
    </div>
  );
}

