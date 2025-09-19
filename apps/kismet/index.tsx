'use client';

import React, { useCallback } from 'react';
import KismetApp from '@/components/apps/kismet.jsx';
import DeauthWalkthrough from './components/DeauthWalkthrough';
import { createLogger } from '../../lib/logger';

const KismetPage: React.FC = () => {
  const handleNetworkDiscovered = useCallback(
    (net?: { ssid: string; bssid: string; discoveredAt: number }) => {
      if (!net) return;
      const logger = createLogger();
      logger.info('network discovered', {
        ssid: net.ssid || net.bssid,
        time: new Date(net.discoveredAt).toISOString(),
      });
    },
    [],
  );

  return (
    <>
      <KismetApp onNetworkDiscovered={handleNetworkDiscovered} />
      <DeauthWalkthrough />
    </>
  );
};

export default KismetPage;
