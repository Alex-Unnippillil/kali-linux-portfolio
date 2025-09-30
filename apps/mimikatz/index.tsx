'use client';

import React, { useState } from 'react';
import MimikatzApp from '../../components/apps/mimikatz';
import ExposureExplainer from './components/ExposureExplainer';
import ExperimentGate from '../../components/util-components/ExperimentGate';

const disclaimerUrl = 'https://www.kali.org/docs/policy/disclaimer/';

const MimikatzPage: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);

  const fallback = (
    <div className="flex h-full flex-col items-center justify-center bg-ub-dark p-6 text-center text-white">
      <h2 className="text-lg font-semibold">Mimikatz lab disabled</h2>
      <p className="mt-2 max-w-md text-xs text-ubt-grey">
        This command lab is restricted. Enable the mimikatz-lab experiment flag to rehearse credential extraction flows or
        continue reviewing blue-team countermeasures in the documentation workspace.
      </p>
    </div>
  );

  return (
    <ExperimentGate flag="mimikatz-lab" fallback={fallback} metadata={{ surface: 'mimikatz-app' }}>
      {confirmed ? (
        <>
          <MimikatzApp />
          <ExposureExplainer />
        </>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 text-white">
          <div className="max-w-md space-y-4 rounded bg-ub-dark p-6 text-center shadow">
            <h2 className="text-xl font-bold">High-Risk Command Warning</h2>
            <p>
              Mimikatz can execute high-risk commands that may compromise system security. Proceed only if you understand the
              risks.
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
                className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
              >
                Proceed
              </button>
              <button
                onClick={() => window.history.back()}
                className="rounded bg-gray-600 px-4 py-2 hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ExperimentGate>
  );
};

export default MimikatzPage;

