'use client';

import React from 'react';
import NetworkInsights from './components/NetworkInsights';
import IOPSBar from './components/IOPSBar';

export default function ResourceMonitorApp() {
  return (
    <div className="h-full w-full bg-ub-cool-grey overflow-auto p-2">
      <div className="mb-4 flex justify-center">
        <IOPSBar />
      </div>
      <NetworkInsights />
    </div>
  );
}

