import React from 'react';
import Callout from '../ui/Callout';

const DownloadGrid: React.FC = () => (
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
    <div className="flex flex-col rounded border p-4">
      <h2 className="mb-2 text-xl font-semibold">WSL</h2>
      <p className="mb-4">Run Kali on Windows Subsystem for Linux.</p>
      <Callout variant="readDocs">
        <p>
          Requires Windows 10/11 with WSL2 enabled. Review the{' '}
          <a
            href="https://www.kali.org/docs/wsl/wsl-prep/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            WSL docs
          </a>{' '}
          and{' '}
          <a
            href="https://www.kali.org/docs/wsl/win-kex/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Win-KeX guide
          </a>
          .
        </p>
      </Callout>
      <a
        href="https://www.kali.org/get-kali/#kali-wsl"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-blue-500 hover:underline"
      >
        Learn more
      </a>
    </div>
  </div>
);

export default DownloadGrid;

