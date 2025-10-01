'use client';

import React from 'react';
import NetworkInsights from './components/NetworkInsights';
import TaskActivity from './components/TaskActivity';

export default function ResourceMonitorApp() {
  return (
    <div className="h-full w-full bg-ub-cool-grey overflow-auto">
      <div className="grid gap-2 lg:grid-cols-2">
        <NetworkInsights />
        <TaskActivity />
      </div>
    </div>
  );
}

