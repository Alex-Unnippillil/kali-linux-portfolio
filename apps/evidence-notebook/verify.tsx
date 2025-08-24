import React, { useState } from 'react';
import { Entry, verifyChain, verifySignature } from './utils';

const VerifyEvidence: React.FC = () => {
  const [valid, setValid] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text) as {
        entries: Entry[];
        signature: string;
        publicKey: string;
      };
      const chainOk = await verifyChain(data.entries);
      const sigOk = await verifySignature(
        JSON.stringify(data.entries),
        data.signature,
        data.publicKey
      );
      setValid(chainOk && sigOk);
      setEntries(data.entries);
    } catch {
      setValid(false);
      setEntries([]);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <input type="file" onChange={handleFile} className="text-sm" />
      {valid !== null && (
        <div className={valid ? 'text-green-400' : 'text-red-400'}>
          {valid ? 'Signature and hash chain valid.' : 'Verification failed.'}
        </div>
      )}
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

export default VerifyEvidence;
