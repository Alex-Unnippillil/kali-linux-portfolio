import React from 'react';
import Callout from '../../components/ui/Callout';

const CloudPage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">Cloud</h1>
    <p>Deploy Kali on popular cloud providers for on-demand access from anywhere.</p>
    <ul className="list-disc pl-6 space-y-1">
      <li>☁️ Account with a supported provider</li>
      <li>🌐 Reliable internet connection</li>
      <li>💾 Instance with at least 20 GB storage</li>
    </ul>
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

