'use client';

import React, { useState } from 'react';
import MetasploitApp from '../../components/apps/metasploit';
import TargetEmulator from './components/TargetEmulator';

const MetasploitPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex justify-center" aria-label="Command running">
          <div className="h-8 w-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <MetasploitApp onLoadingChange={setLoading} />
      <TargetEmulator />
    </div>
  );
};

export default MetasploitPage;
