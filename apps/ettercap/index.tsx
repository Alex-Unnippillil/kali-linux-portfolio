'use client';

import React, { useState } from 'react';
import EttercapApp from '../../components/apps/ettercap';
import CountermeasurePanel from './components/CountermeasurePanel';

const EttercapPage: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <EttercapApp />
      <button
        onClick={() => setShowPanel((s) => !s)}
        className="mt-4 underline text-green-400"
      >
        {showPanel ? 'Hide Countermeasures' : 'View Countermeasures'}
      </button>
      {showPanel && <CountermeasurePanel />}
    </div>
  );
};

export default EttercapPage;

