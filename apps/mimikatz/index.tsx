'use client';

import React from 'react';
import MimikatzApp from '../../components/apps/mimikatz';
import ExposureExplainer from './components/ExposureExplainer';

const MimikatzPage: React.FC = () => {
  return (
    <>
      <MimikatzApp />
      <ExposureExplainer />
    </>
  );
};

export default MimikatzPage;

