'use client';

import React from 'react';
import KismetApp from '../../components/apps/kismet';
import DeauthWalkthrough from './components/DeauthWalkthrough';

const KismetPage: React.FC = () => {
  return (
    <>
      <KismetApp />
      <DeauthWalkthrough />
    </>
  );
};

export default KismetPage;
