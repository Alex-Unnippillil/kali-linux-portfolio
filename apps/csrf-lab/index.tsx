'use client';

import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import CSRFLab from '../../components/apps/csrf-lab';

const CSRFLabApp: React.FC = () => {
  const counterRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = `${Date.now()}-${counterRef.current}`;
    const tabNumber = counterRef.current++;

    return {
      id,
      title: `CSRF Lab ${tabNumber}`,
      content: <CSRFLab />,
    };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-ub-cool-grey text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default CSRFLabApp;
