import React from 'react';
import Callout from '../../components/ui/Callout';

const VMwarePage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">VMware</h1>
    <p>Run Kali in a VMware virtual machine and use snapshots to save and revert your setup anytime.</p>
    <ul className="list-disc pl-6 space-y-1">
      <li>🖥️ Virtualization enabled in BIOS/UEFI</li>
      <li>💾 At least 20 GB free disk space</li>
      <li>🐏 4 GB RAM or more</li>
    </ul>
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

export default VMwarePage;

