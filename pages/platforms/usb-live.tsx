import React from 'react';
import Callout from '../../components/ui/Callout';
import HashRow from '../../components/get-kali/HashRow';

const downloads = [
  {
    label: 'Kali Live USB Image',
    href: '#',
    hash: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  },
];

const USBLivePage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">USB Live</h1>
    <p>Boot from a portable USB drive and run Kali without touching your system&apos;s disk.</p>
    <ul className="list-disc pl-6 space-y-1">
      <li>💾 USB drive with at least 8 GB capacity</li>
      <li>🖥️ BIOS/UEFI that supports booting from USB</li>
      <li>🌐 Internet connection for updates</li>
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

export default USBLivePage;

