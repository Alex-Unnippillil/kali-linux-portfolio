'use client';

import Link from 'next/link';

export default function Verify() {
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Verify Downloads</h1>
      <p>
        Always verify downloaded files to ensure integrity and authenticity. See{' '}
        <Link href="/docs/download-images-securely" className="text-blue-600 underline">
          Download images securely
        </Link>{' '}
        for guidance on retrieving images safely.
      </p>
      <pre className="bg-black text-green-400 p-4 rounded font-mono overflow-x-auto">
        <code>{`$ wget https://example.com/kali.iso
$ sha256sum kali.iso
$ gpg --verify kali.iso.sig kali.iso`}</code>
      </pre>
    </main>
  );
}

