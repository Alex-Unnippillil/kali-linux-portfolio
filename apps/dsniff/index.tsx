'use client';

import React from 'react';
import KillSwitchGate from '../../components/common/KillSwitchGate';
import DsniffApp from '../../components/apps/dsniff';
import { KILL_SWITCH_IDS } from '../../lib/flags';
import CredentialExplainer from './components/CredentialExplainer';
import StressSandbox from './components/StressSandbox';

const DsniffPageContent: React.FC = () => (
  <>
    <DsniffApp />
    <CredentialExplainer />
    <StressSandbox />
  </>
);

const DsniffPage: React.FC = () => (
  <KillSwitchGate
    appId="dsniff"
    appTitle="dsniff"
    killSwitchId={KILL_SWITCH_IDS.dsniff}
  >
    {() => <DsniffPageContent />}
  </KillSwitchGate>
);

export default DsniffPage;
