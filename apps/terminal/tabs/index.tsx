'use client';

import React, { useCallback, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalProps } from '..';

const TerminalTabs: React.FC<TerminalProps> = ({ openApp, initialPath }) => {
  const countRef = useRef(1);

  const createTab = useCallback(
    (path?: string): TabDefinition => {
      const id = Date.now().toString();
      return {
        id,
        title: `Session ${countRef.current++}`,
        content: <Terminal openApp={openApp} initialPath={path} />,
      };
    },
    [openApp]
  );

  const [initialTabs] = useState(() => [createTab(initialPath)]);

  return (
    <TabbedWindow
      className="h-full w-full"
      initialTabs={initialTabs}
      onNewTab={() => createTab()}
    />
  );
};

export default TerminalTabs;
