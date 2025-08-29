'use client';

import React from 'react';
import MetasploitApp from '../../components/apps/metasploit';
import TargetEmulator from './components/TargetEmulator';

const MetasploitPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <MetasploitApp />
      <TargetEmulator />
    </div>
  );
};

export default MetasploitPage;
