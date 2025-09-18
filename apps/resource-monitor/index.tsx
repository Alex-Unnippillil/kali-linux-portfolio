'use client';

import React from 'react';
import StatusBar from '../../components/ui/StatusBar';
import NetworkInsights from './components/NetworkInsights';

export default function ResourceMonitorApp() {
  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 p-3">
        <StatusBar />
        <NetworkInsights />
      </div>
    </div>
  );
}

