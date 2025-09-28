'use client';

import React, { useCallback, useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalProps } from '..';

const TerminalTabs: React.FC<TerminalProps> = ({
  openApp,
  context,
  path,
  initialPath,
}) => {
  const countRef = useRef(1);

  const createTab = useCallback((): TabDefinition => {
    const id = Date.now().toString();
    return {
      id,
      title: `Session ${countRef.current++}`,
      content: (
        <Terminal
          openApp={openApp}
          context={context}
          path={path}
          initialPath={initialPath}
        />
      ),
    };
  }, [context, initialPath, openApp, path]);

  return (
    <TabbedWindow
      className="h-full w-full"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default TerminalTabs;
