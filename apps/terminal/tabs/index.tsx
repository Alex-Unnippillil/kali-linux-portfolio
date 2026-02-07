'use client';

import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalProps } from '..';

const TerminalTabs: React.FC<TerminalProps> = ({ openApp }) => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    const label = `Session ${countRef.current++}`;
    return {
      id,
      title: label,
      content: <Terminal openApp={openApp} sessionName={label} sessionId={id} />,
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
