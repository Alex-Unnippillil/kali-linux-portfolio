'use client';

import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal, { TerminalProps, TerminalHandle } from '..';

const TerminalTabs: React.FC<TerminalProps> = ({ openApp }) => {
  const countRef = useRef(1);
  // Keep a ref to each terminal instance so we can query its content when a tab
  // is deactivated. We also track a buffer map keyed by tab ID to restore
  // previous output if the tab is ever re-mounted.
  const tabRefs = useRef<Record<string, React.RefObject<TerminalHandle>>>({});
  const buffers = useRef<Record<string, string>>({});

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    const ref = React.createRef<TerminalHandle>();
    tabRefs.current[id] = ref;
    return {
      id,
      title: `Session ${countRef.current++}`,
      content: (
        <Terminal
          ref={ref}
          openApp={openApp}
          initialContent={buffers.current[id]}
        />
      ),
      onDeactivate: () => {
        buffers.current[id] = ref.current?.getContent() || '';
      },
      onClose: () => {
        delete tabRefs.current[id];
        delete buffers.current[id];
      },
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
