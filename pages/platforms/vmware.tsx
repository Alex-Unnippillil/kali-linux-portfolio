import React from 'react';
import Callout from '../../components/ui/Callout';

const VMwarePage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">VMware</h1>
    <p>Run Kali in a VMware virtual machine and use snapshots to save and revert your setup anytime.</p>
    <Callout variant="readDocs">
      <p>
        For setup instructions, read the{' '}
        <a
          href="https://www.kali.org/docs/virtualization/install-vmware/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          official documentation
        </a>
        .
      </p>
    </Callout>
    <Callout variant="defaultCredentials">
      <p>
        The default login for VMware images is <code>kali/kali</code>.
      </p>
    </Callout>
  </main>
);

export default VMwarePage;

