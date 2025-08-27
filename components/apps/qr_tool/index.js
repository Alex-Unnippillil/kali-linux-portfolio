import React, { useState } from 'react';
import Generate from './Generate';
import Scan from './Scan';

const QRTool = () => {
  const [tab, setTab] = useState('generate');

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setTab('generate')}
          className={`px-4 py-2 rounded ${tab === 'generate' ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Generate
        </button>
        <button
          onClick={() => setTab('scan')}
          className={`px-4 py-2 rounded ${tab === 'scan' ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          Scan
        </button>
      </div>
      {tab === 'generate' ? <Generate /> : <Scan />}
    </div>
  );
};

export default QRTool;
