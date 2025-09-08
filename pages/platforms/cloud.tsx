import React from 'react';
import Callout from '../../components/ui/Callout';

const CloudPage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">Cloud</h1>
    <p>Deploy Kali on popular cloud providers for on-demand access from anywhere.</p>
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
  </main>
);

export default CloudPage;

