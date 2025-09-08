import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Callout from '../components/ui/Callout';

const InstallOptions: React.FC = () => (
  <main className="p-4">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="border rounded p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">VMware</h2>
        <p className="mb-4">Run Kali in a VMware virtual machine and use snapshots to save and revert your setup anytime.</p>
        <Link href="/platforms/vmware" className="text-blue-500 hover:underline mt-auto">
          Learn more
        </Link>
      </div>
      <div className="border rounded p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">USB Live</h2>
        <p className="mb-4">Boot from a portable USB drive and run Kali without touching your system&apos;s disk.</p>
        <Link href="/platforms/usb-live" className="text-blue-500 hover:underline mt-auto">
          Learn more
        </Link>
      </div>
      <div className="border rounded p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">Cloud</h2>
        <p className="mb-4">Deploy Kali on popular cloud providers for on-demand access from anywhere.</p>
        <div className="mb-4 flex gap-2">
          <Image src="/icons/providers/aws.svg" alt="AWS" width={24} height={24} className="h-6 w-6" />
          <Image src="/icons/providers/azure.svg" alt="Azure" width={24} height={24} className="h-6 w-6" />
          <Image src="/icons/providers/gcp.svg" alt="GCP" width={24} height={24} className="h-6 w-6" />
        </div>
        <Link href="/platforms/cloud" className="text-blue-500 hover:underline mt-auto">
          Learn more
        </Link>
      </div>
    </div>
    <div className="mt-6">
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

export default InstallOptions;

