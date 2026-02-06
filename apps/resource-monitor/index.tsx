'use client';

import { useState } from 'react';
import Tabs from '../../components/Tabs';
import TraceRecorder from '../../components/dev/TraceRecorder';
import NetworkInsights from './components/NetworkInsights';

const TABS = [
  { id: 'network', label: 'Network' },
  { id: 'trace', label: 'Trace Recorder' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ResourceMonitorApp() {
  const [activeTab, setActiveTab] = useState<TabId>('network');

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ub-cool-grey text-white">
      <div className="border-b border-black/40 bg-[var(--kali-panel)] px-3 py-2">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} className="gap-2" />
      </div>
      <div className="flex-1 overflow-auto p-2">
        {activeTab === 'network' ? <NetworkInsights /> : <TraceRecorder />}
      </div>
    </div>
  );
}

