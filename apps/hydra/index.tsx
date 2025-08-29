'use client';

import React, { useRef, useState } from 'react';
import LegalInterstitial from '../../components/ui/LegalInterstitial';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import HydraApp from '../../components/apps/hydra';
import StrategyTrainer from './components/StrategyTrainer';

const HydraPreview: React.FC = () => {
  const [accepted, setAccepted] = useState(false);
  const countRef = useRef(1);

  if (!accepted) {
    return <LegalInterstitial onAccept={() => setAccepted(true)} />;
  }

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Run ${countRef.current++}`, content: <HydraApp /> };
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <TabbedWindow initialTabs={[createTab()]} onNewTab={createTab} />
      <StrategyTrainer />
    </div>
  );
};

export default HydraPreview;
