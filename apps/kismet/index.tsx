'use client';

import React, { useCallback } from 'react';
import KillSwitchGate from '../../components/common/KillSwitchGate';
import KismetApp from '../../components/apps/kismet.jsx';
import DeauthWalkthrough from './components/DeauthWalkthrough';
import { KILL_SWITCH_IDS } from '../../lib/flags';
import { createLogger } from '../../lib/logger';

const KismetPageContent: React.FC = () => {
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

const KismetPage: React.FC = () => (
  <KillSwitchGate
    appId="kismet"
    appTitle="Kismet"
    killSwitchId={KILL_SWITCH_IDS.kismet}
  >
    {() => <KismetPageContent />}
  </KillSwitchGate>
);

export default KismetPage;
