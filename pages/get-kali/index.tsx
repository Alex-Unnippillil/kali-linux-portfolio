import React from 'react';
import Link from 'next/link';
import Callout from '../../components/ui/Callout';

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
        <p className="mb-4">Boot from a portable USB drive and run Kali without touching your system&apos;s disk.</p>
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
      <Callout variant="mirrorInfo">
        <p>
          Downloads are automatically served from the nearest mirror for better
          performance. View the{' '}
          <a
            href="https://http.kali.org/README.mirrorlist"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            full mirror list
          </a>
          .
        </p>
      </Callout>
      <Callout variant="verifyDownload">
        <p>
          Verify downloads using signatures or hashes.{' '}
          <a
            href="https://www.kali.org/docs/introduction/download-validation/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Verification instructions
          </a>
          .
        </p>
      </Callout>
    </div>
  </main>
);

export default GetKali;

