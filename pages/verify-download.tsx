import React, { useState } from 'react';
import CodeBlock from '../components/ui/CodeBlock';
import { sha256File } from '../lib/hash-utils';

const VerifyDownloadPage: React.FC = () => {
  const [expected, setExpected] = useState('');
  const [computed, setComputed] = useState('');
  const [match, setMatch] = useState<boolean | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const hash = await sha256File(file);
    setComputed(hash);
    setMatch(expected ? hash === expected.toLowerCase() : null);
  };

  const handleExpectedChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value.trim().toLowerCase();
    setExpected(value);
    setMatch(computed ? computed === value : null);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold mb-4">Verify Download</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">SHA256 Checksum</h2>
        <p>
          Select your downloaded file to compute its SHA256 checksum and compare
          with the official value.
        </p>
        <CodeBlock className="p-4 bg-[var(--color-muted)] rounded">
{`sha256sum kali-linux.iso`}
        </CodeBlock>
        <input
          type="file"
          onChange={handleFile}
          data-testid="file-input"
          className="block"
        />
        <input
          type="text"
          placeholder="Expected SHA256"
          value={expected}
          onChange={handleExpectedChange}
          data-testid="expected-input"
          className="border rounded p-2 w-full"
        />
        {computed && (
          <p className="font-mono break-all">
            Computed: <span data-testid="computed-hash">{computed}</span>
          </p>
        )}
        {match !== null && (
          <p className={match ? 'text-green-600' : 'text-red-600'}>
            {match ? 'Hashes match' : 'Hashes do not match'}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Signature Verification</h2>
        <p>Use the official signature file to verify your download with GPG.</p>
        <CodeBlock className="p-4 bg-[var(--color-muted)] rounded">
{`gpg --verify kali-linux.iso.sig kali-linux.iso`}
        </CodeBlock>
      </section>
    </div>
  );
};

export default VerifyDownloadPage;
