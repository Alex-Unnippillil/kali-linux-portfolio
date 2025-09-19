'use client';

import React, { useRef } from 'react';
import TabbedWindow, { type TabDefinition } from '../../components/ui/TabbedWindow';
import HydraApp from '../../components/apps/hydra';
import StrategyTrainer from './components/StrategyTrainer';

const HydraPreview: React.FC = () => {
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

export default HydraPreview;
