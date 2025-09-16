'use client';

import React, { useState } from 'react';
import MimikatzApp from '../../components/apps/mimikatz';
import ExposureExplainer from './components/ExposureExplainer';

const disclaimerUrl = 'https://www.kali.org/docs/policy/disclaimer/';

const MimikatzPage: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 text-white z-50">
        <div className="max-w-md p-6 bg-ub-dark rounded elevation-3 text-center space-y-4">
          <h2 className="text-xl font-bold">High-Risk Command Warning</h2>
          <p>
            Mimikatz can execute high-risk commands that may compromise system
            security. Proceed only if you understand the risks.
          </p>
          <a
            href={disclaimerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline"
          >
            Read the full disclaimer
          </a>
          <div className="flex justify-center space-x-4 pt-2">
            <button
              onClick={() => setConfirmed(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Proceed
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MimikatzApp />
      <ExposureExplainer />
    </>
  );
};

export default MimikatzPage;

