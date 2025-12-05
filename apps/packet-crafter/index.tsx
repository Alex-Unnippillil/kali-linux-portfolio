'use client';

import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import PacketCrafterApp from '../../components/apps/packet-crafter/PacketCrafterApp';

const PacketCrafterWindow: React.FC = () => {
  const counterRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
      id,
      title: `Packet ${counterRef.current++}`,
      content: <PacketCrafterApp />,
    };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default PacketCrafterWindow;
