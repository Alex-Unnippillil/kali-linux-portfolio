'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import MimikatzApp from '../../components/apps/mimikatz';
import ExposureExplainer from './components/ExposureExplainer';

const disclaimerUrl = 'https://www.kali.org/docs/policy/disclaimer/';

const MimikatzPage: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 text-white z-50">
        <div className="max-w-md p-6 bg-ub-dark rounded shadow text-center space-y-4">
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
    <div className="space-y-8 bg-[#080b12] p-6 text-white">
      <section className="space-y-4 rounded-lg border border-gray-700 bg-black/50 p-6 shadow-lg">
        <div>
          <h1 className="text-2xl font-semibold">Mimikatz Credential Simulator</h1>
          <p className="mt-2 text-sm text-gray-300">
            Practice credential harvesting workflows without touching production hosts.
            The environment operates entirely on canned data and never executes
            commands on your machine.
          </p>
        </div>
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-md border border-gray-700 bg-black/40 p-4">
            <h2 className="text-base font-semibold">Safe-mode by design</h2>
            <p className="mt-2 text-gray-300">
              Dumps, tokens, and tickets are pre-seeded with fictional payloads so you
              can explore the UI flows while the simulator blocks any real system calls
              or network traffic.
            </p>
          </div>
          <div className="rounded-md border border-gray-700 bg-black/40 p-4">
            <h2 className="text-base font-semibold">Recommended workflow</h2>
            <p className="mt-2 text-gray-300">
              Step through each tab, mask sensitive values until you are ready to
              export, and compare the canned output with your incident response playbook
              to rehearse safe credential handling.
            </p>
          </div>
          <div className="rounded-md border border-gray-700 bg-black/40 p-4">
            <h2 className="text-base font-semibold">Offline practice lab</h2>
            <p className="mt-2 text-gray-300">
              Need a distraction-free drill? Launch the standalone workbench for
              tabletop sessions or classroom demos.
            </p>
            <Link
              href="/apps/mimikatz/offline"
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500"
            >
              Open offline version
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section className="space-y-6">
        <div className="overflow-hidden rounded-lg border border-gray-800 bg-black/60 shadow-inner">
          <MimikatzApp />
        </div>
        <div className="border-t border-gray-800 pt-6">
          <h2 className="mb-4 text-xl font-semibold">Exposure simulator explainer</h2>
          <ExposureExplainer />
        </div>
      </section>
    </div>
  );
};

export default MimikatzPage;

