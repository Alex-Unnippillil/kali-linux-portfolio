import React from 'react';
import Callout from '../../components/ui/Callout';

const USBLivePage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">USB Live</h1>
    <p>Boot from a portable USB drive and run Kali without touching your system&apos;s disk.</p>
    <ul className="list-disc pl-6 space-y-1">
      <li>💾 USB drive with at least 8 GB capacity</li>
      <li>🖥️ BIOS/UEFI that supports booting from USB</li>
      <li>🌐 Internet connection for updates</li>
    </ul>
    <Callout variant="readDocs">
      <p>
        Create a persistent live USB by following the{' '}
        <a
          href="https://www.kali.org/docs/usb/usb-persistence/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          step-by-step guide
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

export default USBLivePage;

