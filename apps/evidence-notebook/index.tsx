import React, { useState } from 'react';
import Link from 'next/link';
import {
  Entry,
  hashEntry,
  generateKeyPair,
  signData,
  exportPublicKey,
} from './utils';

const EvidenceNotebook: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState('');
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);

  const addEntry = async () => {
    if (!text) return;
    const timestamp = new Date().toISOString();
    const prevHash = entries.length ? entries[entries.length - 1].hash : '';
    const hash = await hashEntry(text, prevHash, timestamp);
    setEntries([...entries, { data: text, timestamp, hash }]);
    setText('');
  };

  const exportJson = async () => {
    if (entries.length === 0) return;
    const kp = keyPair ?? (await generateKeyPair());
    if (!keyPair) setKeyPair(kp);
    const dataStr = JSON.stringify(entries);
    const signature = await signData(dataStr, kp.privateKey);
    const publicKey = await exportPublicKey(kp.publicKey);
    const signed = { entries, signature, publicKey };
    const blob = new Blob([JSON.stringify(signed, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidence.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          aria-label="Entry"
          className="flex-1 text-black px-2 py-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="button"
          onClick={addEntry}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => alert('Transparency log upload coming soon')}
          className="px-3 py-1 bg-gray-600 rounded"
        >
          Upload
        </button>
      </div>
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={exportJson}
          className="px-3 py-1 bg-green-600 rounded disabled:bg-gray-600"
          disabled={entries.length === 0}
        >
          Export Signed JSON
        </button>
        <Link
          href="/apps/evidence-notebook/verify"
          className="px-3 py-1 bg-purple-600 rounded"
        >
          Verify
        </Link>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2">Timestamp</th>
              <th className="text-left p-2">Data</th>
              <th className="text-left p-2">Hash</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className="border-t border-gray-700">
                <td className="p-2">{e.timestamp}</td>
                <td className="p-2 break-all">{e.data}</td>
                <td className="p-2 break-all">{e.hash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvidenceNotebook;
