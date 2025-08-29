'use client';

import React from 'react';
import DsniffApp from '../../components/apps/dsniff';
import CredentialExplainer from './components/CredentialExplainer';
import MitigationChecklist from './components/MitigationChecklist';

const DsniffPage: React.FC = () => {
  return (
    <>
      <DsniffApp />
      <CredentialExplainer />
      <MitigationChecklist />
    </>
  );
};

export default DsniffPage;
