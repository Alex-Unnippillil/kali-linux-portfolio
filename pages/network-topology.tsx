import React from 'react';
import dynamic from 'next/dynamic';

const NetworkAttackStepper = dynamic(() => import('../components/NetworkAttackStepper'), { ssr: false });

const NetworkTopologyPage = () => (
  <main>
    <div className="bg-yellow-200 text-center font-bold p-4">
      Use offensive security tools responsibly with proper authorization.
    </div>
    <NetworkAttackStepper />
  </main>
);

export default NetworkTopologyPage;
