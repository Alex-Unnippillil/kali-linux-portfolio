'use client';

import React from 'react';
import KillSwitchGate from '../../../components/common/KillSwitchGate';
import MimikatzOffline from '../../../components/apps/mimikatz/offline';
import { KILL_SWITCH_IDS } from '../../../lib/flags';

const MimikatzOfflineApp: React.FC = () => (
  <KillSwitchGate
    appId="mimikatz/offline"
    appTitle="Mimikatz Offline"
    killSwitchId={KILL_SWITCH_IDS.mimikatz}
  >
    {() => <MimikatzOffline />}
  </KillSwitchGate>
);

export default MimikatzOfflineApp;
