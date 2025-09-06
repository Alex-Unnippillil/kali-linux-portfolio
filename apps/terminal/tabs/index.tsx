'use client';

import React, { useCallback, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalProps } from '..';

const TerminalTabs: React.FC<TerminalProps> = ({ openApp }) => {
  const countRef = useRef(1);
  const [scheme, setScheme] = useState('Kali-Dark');
  const [opacity, setOpacity] = useState(1);

  const handleSettingsChange = useCallback((s: string, o: number) => {
    setScheme(s);
    setOpacity(o);
  }, []);

  const createTab = useCallback((): TabDefinition => {
    const id = Date.now().toString();
    return {
      id,
      title: `Session ${countRef.current++}`,
      content: (
        <Terminal
          openApp={openApp}
          scheme={scheme}
          opacity={opacity}
          onSettingsChange={handleSettingsChange}
        />
      ),
    };
  }, [openApp, scheme, opacity, handleSettingsChange]);

  return (
    <TabbedWindow
      className="h-full w-full"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default TerminalTabs;
