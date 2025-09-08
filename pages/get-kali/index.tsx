import React from 'react';
import Link from 'next/link';
import MirrorIntegrity from '../../components/get-kali/MirrorIntegrity';

const GetKali: React.FC = () => (
  <main className="p-4">
    <div className="mb-6 flex items-center justify-between rounded bg-purple-600 p-4 text-white">
      <span className="text-lg">New to Kali Linux? Learn how to get started.</span>
      <Link href="/install-options" className="rounded bg-white px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50">
        Learn More
      </Link>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="flex flex-col rounded border p-4">
        <h2 className="mb-2 text-xl font-semibold">VMware</h2>
        <p className="mb-4">Run Kali in a VMware virtual machine and use snapshots to save and revert your setup anytime.</p>
        <a
          href="https://www.kali.org/get-kali/#kali-virtual-machines"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-blue-500 hover:underline"
        >
          Learn more
        </a>
      </div>
      <div className="flex flex-col rounded border p-4">
        <h2 className="mb-2 text-xl font-semibold">USB Live</h2>
        <p className="mb-4">Boot from a portable USB drive and run Kali without touching your system's disk.</p>
        <a
          href="https://www.kali.org/get-kali/#kali-live"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-blue-500 hover:underline"
        >
          Learn more
        </a>
      </div>
      <div className="flex flex-col rounded border p-4">
        <h2 className="mb-2 text-xl font-semibold">Cloud</h2>
        <p className="mb-4">Deploy Kali on popular cloud providers for on-demand access from anywhere.</p>
        <div className="mb-4 flex gap-2">
          <img src="/icons/providers/aws.svg" alt="AWS" className="h-6 w-6" />
          <img src="/icons/providers/azure.svg" alt="Azure" className="h-6 w-6" />
          <img src="/icons/providers/gcp.svg" alt="GCP" className="h-6 w-6" />
        </div>
        <a
          href="https://www.kali.org/get-kali/#kali-cloud"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-blue-500 hover:underline"
        >
          Learn more
        </a>
      </div>
    </div>
    <div className="mt-6">
      <MirrorIntegrity />
    </div>
  </main>
);

export default GetKali;

