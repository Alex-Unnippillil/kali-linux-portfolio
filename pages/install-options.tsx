import React from 'react';

const InstallOptions: React.FC = () => (
  <main className="p-4">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border rounded p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">VMware</h2>
        <p className="mb-4">Run Kali in a VMware virtual machine and use snapshots to save and revert your setup anytime.</p>
        <a
          href="https://www.kali.org/get-kali/#kali-virtual-machines"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline mt-auto"
        >
          Learn more
        </a>
      </div>
      <div className="border rounded p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">USB Live</h2>
        <p className="mb-4">Boot from a portable USB drive and run Kali without touching your system&apos;s disk.</p>
        <a
          href="https://www.kali.org/get-kali/#kali-live"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline mt-auto"
        >
          Learn more
        </a>
      </div>
      <div className="border rounded p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">Cloud</h2>
        <p className="mb-4">Deploy Kali on popular cloud providers for on-demand access from anywhere.</p>
        <a
          href="https://www.kali.org/get-kali/#kali-cloud"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline mt-auto"
        >
          Learn more
        </a>
      </div>
    </div>
  </main>
);

export default InstallOptions;

