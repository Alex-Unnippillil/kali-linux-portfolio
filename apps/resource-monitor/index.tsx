'use client';

import React from 'react';
import NetworkInsights from './components/NetworkInsights';

export default function ResourceMonitorApp() {
  return (
    <div className="h-full w-full bg-ub-cool-grey overflow-auto">
      <NetworkInsights />
    </div>
  );
}

