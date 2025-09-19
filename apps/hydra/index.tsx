'use client';

import React, { useRef } from 'react';
import KillSwitchGate from '../../components/common/KillSwitchGate';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import HydraApp from '../../components/apps/hydra';
import { KILL_SWITCH_IDS } from '../../lib/flags';
import StrategyTrainer from './components/StrategyTrainer';

const HydraPreviewContent: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return {
      id,
      title: `Run ${countRef.current++}`,
      content: <HydraApp key={id} />,
    };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TabbedWindow initialTabs={[createTab()]} onNewTab={createTab} />
      <StrategyTrainer />
    </div>
  );
};

const HydraPreview: React.FC = () => (
  <KillSwitchGate
    appId="hydra"
    appTitle="Hydra"
    killSwitchId={KILL_SWITCH_IDS.hydra}
  >
    {() => <HydraPreviewContent />}
  </KillSwitchGate>
);

export default HydraPreview;
