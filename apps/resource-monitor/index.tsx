'use client';

import React from 'react';
import NetworkInsights from './components/NetworkInsights';
import PerformanceStats from './components/PerformanceStats';

export default function ResourceMonitorApp() {
  return (
    <div className="h-full w-full bg-ub-cool-grey overflow-auto">
      <div className="grid grid-cols-1 gap-2 p-2 md:grid-cols-2">
        <NetworkInsights />
        <PerformanceStats />
      </div>
    </div>
  );
}

