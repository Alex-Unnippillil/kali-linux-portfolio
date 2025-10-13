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
      className="h-full w-full bg-[var(--kali-bg)] text-[var(--kali-text)]"
      initialTabs={[createTab()]}
      onNewTab={createTab}
      classNames={{
        tabBar:
          'border-b border-white/10 bg-kali-surface/85 text-white/80 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm',
        tab: 'backdrop-blur-sm',
        tabActive:
          'border-[color:color-mix(in_srgb,var(--kali-blue)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-blue)_24%,var(--kali-surface))] text-white',
        tabInactive:
          'border-transparent text-white/70 hover:border-[color:color-mix(in_srgb,var(--kali-blue)_40%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-blue)_14%,transparent)] hover:text-white',
      }}
    />
  );
};

export default TerminalTabs;
