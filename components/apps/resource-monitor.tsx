'use client';

import React from 'react';
import VitalsChart from '../../apps/resource-monitor/components/VitalsChart';

const ResourceMonitor: React.FC = () => {
  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-2">
      <VitalsChart />
    </div>
  );
};

export default ResourceMonitor;
