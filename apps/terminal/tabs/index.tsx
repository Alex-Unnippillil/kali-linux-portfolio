'use client';

import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalProps } from '..';

const TerminalTabs: React.FC<TerminalProps> = ({ openApp }) => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return {
      id,
      title: `Session ${countRef.current++}`,
      content: <Terminal openApp={openApp} />,
    };
  };

  return (
    <TabbedWindow
      className="h-full w-full"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default TerminalTabs;
