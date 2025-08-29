'use client';

import { useState } from 'react';
import QRScanner from '../../components/apps/qr';
import BatchMaker from './components/BatchMaker';

const QRApp: React.FC = () => {
  const [mode, setMode] = useState<'scan' | 'batch'>('scan');
  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 p-2 bg-ub-cool-grey text-white">
        <button
          type="button"
          onClick={() => setMode('scan')}
          className={`px-2 py-1 rounded ${mode === 'scan' ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          Scan
        </button>
        <button
          type="button"
          onClick={() => setMode('batch')}
          className={`px-2 py-1 rounded ${mode === 'batch' ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          Batch
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {mode === 'scan' ? <QRScanner /> : <BatchMaker />}
      </div>
    </div>
  );
};

export default QRApp;

