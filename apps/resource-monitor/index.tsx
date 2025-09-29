'use client';

import React from 'react';
import NetworkInsights from './components/NetworkInsights';
import {
  isResourceMonitorEnabled,
  RESOURCE_MONITOR_ENV_FLAG,
} from './feature';

function ResourceMonitorContent() {
  return (
    <div className="h-full w-full bg-ub-cool-grey overflow-auto">
      <NetworkInsights />
    </div>
  );
}

function ResourceMonitorDisabledNotice() {
  return (
    <div className="h-full w-full bg-ub-cool-grey text-ubt-grey flex flex-col items-center justify-center px-6 text-center gap-3">
      <h2 className="text-lg font-semibold text-white">Resource Monitor disabled</h2>
      <p className="text-sm">
        This build hides the Resource Monitor outside development. Set{' '}
        <code className="bg-black/40 px-1 py-0.5 rounded text-white">
          {`${RESOURCE_MONITOR_ENV_FLAG}=true`}
        </code>{' '}
        in your environment to opt in for debugging builds.
      </p>
      <p className="text-xs text-ubt-grey/80">
        Local development (`yarn dev`) keeps the monitor enabled automatically.
      </p>
    </div>
  );
}

export default function ResourceMonitorApp() {
  if (!isResourceMonitorEnabled) {
    return <ResourceMonitorDisabledNotice />;
  }

  return <ResourceMonitorContent />;
}

export { isResourceMonitorEnabled } from './feature';

