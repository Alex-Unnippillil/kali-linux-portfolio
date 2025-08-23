import React, { useState } from 'react';
import CryptoJS from 'crypto-js';

interface Hashes {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
  sha3: string;
  sri256: string;
  sri512: string;
}

const emptyHashes: Hashes = {
  md5: '',
  sha1: '',
  sha256: '',
  sha512: '',
  sha3: '',
  sri256: '',
  sri512: '',
};

const HashToolkit: React.FC = () => {
  const [text, setText] = useState('');
  const [hashes, setHashes] = useState<Hashes>(emptyHashes);
  const [error, setError] = useState('');

  const compute = (data: CryptoJS.lib.WordArray) => {
    const md5 = CryptoJS.MD5(data);
    const sha1 = CryptoJS.SHA1(data);
    const sha256 = CryptoJS.SHA256(data);
    const sha512 = CryptoJS.SHA512(data);
    const sha3 = CryptoJS.SHA3(data);
    const sri256 = `sha256-${sha256.toString(CryptoJS.enc.Base64)}`;
    const sri512 = `sha512-${sha512.toString(CryptoJS.enc.Base64)}`;
    setHashes({
      md5: md5.toString(),
      sha1: sha1.toString(),
      sha256: sha256.toString(),
      sha512: sha512.toString(),
      sha3: sha3.toString(),
      sri256,
      sri512,
    });
  };

  const handleText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    setError('');
    if (!value) {
      setHashes(emptyHashes);
      return;
    }
    const wordArray = CryptoJS.enc.Utf8.parse(value);
    compute(wordArray);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      file.type &&
      !file.type.startsWith('text') &&
      file.type !== 'application/javascript'
    ) {
      setError('Unsupported file type');
      return;
    }
    setError('');
    const buffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(buffer);
    compute(wordArray);
  };

  const copy = (value: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
  };

  const hashEntries = [
    { label: 'MD5', key: 'md5' },
    { label: 'SHA-1', key: 'sha1' },
    { label: 'SHA-256', key: 'sha256' },
    { label: 'SHA-512', key: 'sha512' },
    { label: 'SHA-3', key: 'sha3' },
  ] as const;

  const sriEntries = [
    { label: 'SRI (SHA-256)', key: 'sri256' },
    { label: 'SRI (SHA-512)', key: 'sri512' },
  ] as const;

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-gray-900 text-white">
      <div className="mb-4">
        <textarea
          data-testid="text-input"
          value={text}
          onChange={handleText}
          className="w-full h-32 p-2 rounded text-black"
          placeholder="Enter text"
        />
      </div>
      <div className="mb-4">
        <input
          data-testid="file-input"
          type="file"
          onChange={handleFile}
          className="mb-2"
        />
        {error && (
          <div role="alert" className="text-red-500">
            {error}
          </div>
        )}
      </div>
      <div className="space-y-2">
        {hashEntries.map(({ label, key }) => (
          <div key={key} className="flex items-center space-x-2">
            <span className="w-32">{label}:</span>
            <input
              data-testid={key}
              readOnly
              value={(hashes as any)[key]}
              className="flex-1 bg-gray-800 p-1 rounded text-white font-mono"
            />
            <button
              data-testid={`copy-${key}`}
              onClick={() => copy((hashes as any)[key])}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-2 mt-4">
        {sriEntries.map(({ label, key }) => (
          <div key={key} className="flex items-center space-x-2">
            <span className="w-32">{label}:</span>
            <input
              data-testid={key}
              readOnly
              value={(hashes as any)[key]}
              className="flex-1 bg-gray-800 p-1 rounded text-white font-mono"
            />
            <button
              data-testid={`copy-${key}`}
              onClick={() => copy((hashes as any)[key])}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HashToolkit;

