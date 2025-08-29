'use client';

import React, { useCallback } from 'react';
import KismetApp from '../../components/apps/kismet';
import DeauthWalkthrough from './components/DeauthWalkthrough';

const KismetPage: React.FC = () => {
  const handleNetworkDiscovered = useCallback(
    (net: { ssid: string; bssid: string; discoveredAt: number }) => {
      console.log(
        `Network ${net.ssid || net.bssid} discovered at ${new Date(
          net.discoveredAt,
        ).toLocaleTimeString()}`,
      );
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
