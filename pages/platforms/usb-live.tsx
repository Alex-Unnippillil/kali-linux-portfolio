import React from 'react';
import Callout from '../../components/ui/Callout';

const USBLivePage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">USB Live</h1>
    <p>Boot from a portable USB drive and run Kali without touching your system&apos;s disk.</p>
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
  </main>
);

export default USBLivePage;

