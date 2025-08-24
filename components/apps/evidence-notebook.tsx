import React, { useState, useEffect, ChangeEvent } from 'react';

interface Entry {
  file: File;
  note: string;
  hash?: string;
  chain?: string;
  signature?: string;
  verified?: boolean;
  locked?: boolean;
}
const EvidenceNotebook: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [publicKey, setPublicKey] = useState<JsonWebKey | null>(null);

  useEffect(() => {
    (async () => {
      const kp = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
      );
      setKeyPair(kp);
      const pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
      setPublicKey(pub);
    })();
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEntries((prev) => [...prev, ...files.map((file) => ({ file, note: '' }))]);
  };

  const onNoteChange = (index: number, note: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, note } : entry))
    );
  };

  const bufferToHex = (buffer: ArrayBuffer): string =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  const hashEntry = async (entry: Entry): Promise<string> => {
    const fileBuffer = await entry.file.arrayBuffer();
    const noteBuffer = new TextEncoder().encode(entry.note);
    const combined = new Uint8Array(fileBuffer.byteLength + noteBuffer.byteLength);
    combined.set(new Uint8Array(fileBuffer), 0);
    combined.set(noteBuffer, fileBuffer.byteLength);
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    return bufferToHex(hashBuffer);
  };

  const signData = async (data: string): Promise<string> => {
    if (!keyPair) return '';
    const sigBuffer = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      keyPair.privateKey,
      new TextEncoder().encode(data)
    );
    return btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  };

  const hashEntries = async () => {
    const hashes = await Promise.all(entries.map(hashEntry));
    let prev = '';
    const updated: Entry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const chainBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(prev + hashes[i])
      );
      const chainHex = bufferToHex(chainBuffer);
      const signature = await signData(chainHex);
      updated.push({
        ...entries[i],
        hash: hashes[i],
        chain: chainHex,
        signature,
        verified: true,
        locked: true,
      });
      prev = chainHex;
    }
    setEntries(updated);
  };

  const verifyEntries = async (): Promise<boolean> => {
    if (!keyPair) return false;
    let prev = '';
    let ok = true;
    const updated: Entry[] = [];
    const hashes = await Promise.all(entries.map(hashEntry));
    for (let i = 0; i < entries.length; i++) {
      const chainBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(prev + hashes[i])
      );
      const chainHex = bufferToHex(chainBuffer);
      const sigValid = entries[i].signature
        ? await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            keyPair!.publicKey,
            Uint8Array.from(
              atob(entries[i].signature!),
              (c) => c.charCodeAt(0),
            ),
            new TextEncoder().encode(chainHex)
          )
        : false;
      const entryOk =
        hashes[i] === entries[i].hash &&
        chainHex === entries[i].chain &&
        sigValid;
      updated.push({ ...entries[i], verified: entryOk });
      if (!entryOk) ok = false;
      prev = chainHex;
    }
    setEntries(updated);
    return ok;
  };

  const exportJsonl = async () => {
    const ok = await verifyEntries();
    if (!ok) {
      alert('Integrity check failed');
      return;
    }
    const lines: string[] = [];
    if (publicKey) lines.push(JSON.stringify({ publicKey }));
    for (const e of entries) {
      lines.push(
        JSON.stringify({
          name: e.file.name,
          note: e.note,
          hash: e.hash,
          chain: e.chain,
          signature: e.signature,
        })
      );
    }
    const blob = new Blob([lines.join('\n')], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'evidence.jsonl';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-panel text-white p-4 space-y-4 overflow-hidden">
      <input type="file" multiple onChange={onFileChange} />
      <div className="flex-1 overflow-auto">
        {entries.map((entry, idx) => (
          <div key={idx} className="mb-4">
            <div className="mb-1 flex items-center space-x-2">
              <span>{entry.file.name}</span>
              {entry.verified !== undefined && (
                <span className={entry.verified ? 'text-green-400' : 'text-red-500'}>
                  {entry.verified ? '✔' : '✖'}
                </span>
              )}
            </div>
            <textarea
              className="w-full p-1 text-black"
              placeholder="Notes"
              value={entry.note}
              onChange={(e) => onNoteChange(idx, e.target.value)}
              readOnly={entry.locked}
            />
            {entry.hash && (
              <div className="mt-1 text-xs break-all">
                <div>Hash: {entry.hash}</div>
                <div>Chain: {entry.chain}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded disabled:opacity-50"
          onClick={hashEntries}
          disabled={entries.length === 0}
        >
          Hash Entries
        </button>
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded disabled:opacity-50"
          onClick={exportJsonl}
          disabled={entries.some((e) => !e.locked)}
        >
          Export
        </button>
      </div>
    </div>
  );
};

export default EvidenceNotebook;

export const displayEvidenceNotebook = () => <EvidenceNotebook />;
