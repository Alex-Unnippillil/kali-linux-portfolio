import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import TerminalApp from '.';

type TerminalTabsProps = {
  openApp?: (id: string) => void;
};

const TerminalTabs: React.FC<TerminalTabsProps> = ({ openApp }) => {
  const countRef = useRef(1);
  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return {
      id,
      title: `Session ${countRef.current++}`,
      content: <TerminalApp openApp={openApp} />,
    };
  };

  return (
    <TabbedWindow
      className="h-full"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default TerminalTabs;
