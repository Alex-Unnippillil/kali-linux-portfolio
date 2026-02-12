'use client';

import React from 'react';
import NetworkInsights from './components/NetworkInsights';
import StoragePanel from './components/StoragePanel';

export default function ResourceMonitorApp() {
  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey">
      <div className="grid gap-4 p-3 md:grid-cols-2">
        <NetworkInsights />
        <StoragePanel />
      </div>
    </div>
  );
}
