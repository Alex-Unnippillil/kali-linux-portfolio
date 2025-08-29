'use client';

import React from 'react';
import MetasploitApp from '../../components/apps/metasploit';
import ModuleCatalog from './components/ModuleCatalog';

const MetasploitPage: React.FC = () => {
  return (
    <div>
      <MetasploitApp />
      <ModuleCatalog />
    </div>
  );
};

export default MetasploitPage;
