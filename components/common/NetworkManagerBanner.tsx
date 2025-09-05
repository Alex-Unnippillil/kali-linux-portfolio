"use client";

import React from 'react';
import { useNetworkManager } from '../../hooks/useNetworkManager';

const NetworkManagerBanner: React.FC = () => {
  const { running, setRunning } = useNetworkManager();

  if (running) return null;

  return (
    <div className="bg-yellow-300 text-black text-center py-2">
      Network Manager not running.{' '}
      <button
        type="button"
        className="underline"
        onClick={() => setRunning(true)}
      >
        Start service
      </button>
    </div>
  );
};

export default NetworkManagerBanner;

