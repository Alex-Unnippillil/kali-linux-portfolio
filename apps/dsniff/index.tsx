'use client';

import React from 'react';
import DsniffApp from '@/components/apps/dsniff';
import CredentialExplainer from './components/CredentialExplainer';
import StressSandbox from './components/StressSandbox';

const DsniffPage: React.FC = () => {
  return (
    <>
      <DsniffApp />
      <CredentialExplainer />
      <StressSandbox />
    </>
  );
};

export default DsniffPage;
