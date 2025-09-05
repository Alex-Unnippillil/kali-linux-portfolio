"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import usePersistentState from './usePersistentState';

interface NetworkManagerContextValue {
  running: boolean;
  setRunning: (value: boolean) => void;
}

const NetworkManagerContext = createContext<NetworkManagerContextValue>({
  running: false,
  setRunning: () => {},
});

export function NetworkManagerProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = usePersistentState<boolean>('network-manager-running', false);
  return (
    <NetworkManagerContext.Provider value={{ running, setRunning }}>
      {children}
    </NetworkManagerContext.Provider>
  );
}

export const useNetworkManager = () => useContext(NetworkManagerContext);

