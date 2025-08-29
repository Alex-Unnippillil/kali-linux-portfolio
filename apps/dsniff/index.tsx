'use client';

import React from 'react';
import DsniffApp from '../../components/apps/dsniff';
import CredentialExplainer from './components/CredentialExplainer';

const DsniffPage: React.FC = () => {
  return (
    <>
      <DsniffApp />
      <CredentialExplainer />
    </>
  );
};

export default DsniffPage;
