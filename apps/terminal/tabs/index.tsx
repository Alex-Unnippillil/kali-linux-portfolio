'use client';

import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalProps } from '..';

const TerminalTabs: React.FC<TerminalProps> = ({ openApp, initialCommand, command, cmd, ...rest }) => {
  const countRef = useRef(1);
  const initialCommandRef = useRef<string | undefined>(
    [initialCommand, command, cmd]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => value.length > 0) || undefined,
  );

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    const commandForTab = initialCommandRef.current;
    initialCommandRef.current = undefined;
    return {
      id,
      title: `Session ${countRef.current++}`,
      content: (
        <Terminal
          openApp={openApp}
          initialCommand={commandForTab}
          {...rest}
        />
      ),
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
