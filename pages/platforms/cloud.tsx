import React from 'react';
import Callout from '../../components/ui/Callout';
import HashRow from '../../components/get-kali/HashRow';

const downloads = [
  {
    label: 'Kali Cloud Image',
    href: '#',
    hash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  },
];

const CloudPage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">Cloud</h1>
    <p>Deploy Kali on popular cloud providers for on-demand access from anywhere.</p>
    <ul className="list-disc pl-6 space-y-1">
      <li>☁️ Account with a supported provider</li>
      <li>🌐 Reliable internet connection</li>
      <li>💾 Instance with at least 20 GB storage</li>
    </ul>
    <section className="grid gap-4 sm:grid-cols-2">
      {downloads.map((d) => (
        <div key={d.label} className="border rounded p-4 flex flex-col">
          <a href={d.href} className="text-blue-500 hover:underline mb-2">
            {d.label}
          </a>
          {d.hash && <HashRow hash={d.hash} />}
        </div>
      ))}
    </section>
    <Callout variant="readDocs">
      <p>
        Read the{' '}
        <a
          href="https://www.kali.org/docs/cloud/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          cloud deployment documentation
        </a>
        {' '}to get started.
      </p>
    </Callout>
    <Callout variant="mirrorInfo">
      <p>
        Downloads are served from the nearest mirror for best performance. See
        the{' '}
        <a
          href="https://http.kali.org/README.mirrorlist"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          mirror locations
        </a>
        .
      </p>
    </Callout>
    <Callout variant="verifyDownload">
      <p>
        Verify the image after downloading using signatures or hashes.{' '}
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
  </main>
);

export default CloudPage;

