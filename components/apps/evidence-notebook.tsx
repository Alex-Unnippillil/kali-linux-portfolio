import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import JSZip from 'jszip';

interface Entry {
  file: File;
  note: string;
  link?: string;
  hash?: string;
  chain?: string;
  signature?: string;
  verified?: boolean;
  locked?: boolean;
  timestamp?: string;
  iv?: string;
  encrypted?: boolean;
}

const EvidenceNotebook: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [publicKey, setPublicKey] = useState<JsonWebKey | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [decryptedNotes, setDecryptedNotes] = useState<Record<number, string>>({});

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const noteIdx = params.get('note');
    if (noteIdx) {
      const el = document.getElementById(`note-${noteIdx}`);
      el?.scrollIntoView();
    }
  }, []);

  useEffect(() => {
    (async () => {
      const dec: Record<number, string> = {};
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (e.encrypted && e.iv && encryptionKey) {
          try {
            dec[i] = await decryptNote(e.note, e.iv);
          } catch {
            dec[i] = '[decryption failed]';
          }
        } else {
          dec[i] = e.note;
        }
      }
      setDecryptedNotes(dec);
    })();
    }, [entries, encryptionKey, decryptNote]);

  const deriveKey = async (pass: string): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(pass),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('evidence-notebook'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const toBase64 = (buf: ArrayBuffer | Uint8Array): string =>
    btoa(String.fromCharCode(...new Uint8Array(buf)));
  const fromBase64 = (b64: string): Uint8Array =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  const encryptNote = async (note: string) => {
    if (!encryptionKey) return { cipherText: note };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      new TextEncoder().encode(note)
    );
    return { cipherText: toBase64(cipher), iv: toBase64(iv) };
  };

    const decryptNote = useCallback(
      async (cipherText: string, iv: string) => {
        const buf = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: fromBase64(iv) },
          encryptionKey!,
          fromBase64(cipherText)
        );
        return new TextDecoder().decode(buf);
      },
      [encryptionKey]
    );

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setEntries((prev) => [
      ...prev,
      ...files.map((file) => ({ file, note: '' })),
    ]);
  };

  const onNoteChange = (index: number, note: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, note } : entry))
    );
  };

  const onLinkChange = (index: number, link: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, link } : entry))
    );
  };

  const deleteEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const copyEntry = (index: number) => {
    const { file, ...rest } = entries[index];
    navigator.clipboard.writeText(
      JSON.stringify({ ...rest, file: file.name })
    );
  };

  const bufferToHex = (buffer: ArrayBuffer): string =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  const hashEntry = async (entry: Entry): Promise<string> => {
    const fileBuffer = await entry.file.arrayBuffer();
    const noteBuffer = new TextEncoder().encode(entry.note);
    const tsBuffer = new TextEncoder().encode(entry.timestamp || '');
    const linkBuffer = new TextEncoder().encode(entry.link || '');
    const combined = new Uint8Array(
      fileBuffer.byteLength +
        noteBuffer.byteLength +
        tsBuffer.byteLength +
        linkBuffer.byteLength
    );
    combined.set(new Uint8Array(fileBuffer), 0);
    combined.set(noteBuffer, fileBuffer.byteLength);
    combined.set(tsBuffer, fileBuffer.byteLength + noteBuffer.byteLength);
    combined.set(
      linkBuffer,
      fileBuffer.byteLength + noteBuffer.byteLength + tsBuffer.byteLength
    );
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
    let prev = '';
    const updated: Entry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      let note = entry.note;
      let iv = entry.iv;
      let encrypted = entry.encrypted;
      if (encryptionKey && !encrypted) {
        const enc = await encryptNote(note);
        note = enc.cipherText;
        iv = enc.iv;
        encrypted = true;
      }
      const timestamp = entry.timestamp || new Date().toISOString();
      const hash = await hashEntry({ ...entry, note, timestamp });
      const chainBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(prev + hash)
      );
      const chainHex = bufferToHex(chainBuffer);
      const signature = await signData(chainHex);
      updated.push({
        ...entry,
        note,
        iv,
        encrypted,
        timestamp,
        hash,
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

  const exportBundle = async () => {
    const ok = await verifyEntries();
    if (!ok) {
      alert('Integrity check failed');
      return;
    }
    const zip = new JSZip();
    const manifest = {
      publicKey,
      entries: entries.map((e) => ({
        name: e.file.name,
        note: e.note,
        link: e.link,
        hash: e.hash,
        chain: e.chain,
        signature: e.signature,
        timestamp: e.timestamp,
        iv: e.iv,
        encrypted: e.encrypted,
      })),
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    for (const e of entries) {
      const buf = await e.file.arrayBuffer();
      zip.file(e.file.name, buf);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const setEncryption = async () => {
    if (!passphrase) {
      setEncryptionKey(null);
      return;
    }
    const key = await deriveKey(passphrase);
    setEncryptionKey(key);
  };

  const copyDeepLink = (idx: number) => {
    const url = `${window.location.origin}${window.location.pathname}?app=evidence-notebook&note=${idx}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-panel text-white p-4 space-y-4 overflow-hidden">
      <input type="file" multiple onChange={onFileChange} />
      <div className="flex space-x-2">
        <input
          type="password"
          className="p-1 text-black flex-1"
          placeholder="Encryption passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
          onClick={setEncryption}
        >
          {encryptionKey ? 'Update Key' : 'Set Key'}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {entries.map((entry, idx) => (
          <div key={idx} id={`note-${idx}`} className="mb-4">
            <div className="mb-1 flex items-center space-x-2">
              <span>{entry.file.name}</span>
              {entry.verified !== undefined && (
                <span className={entry.verified ? 'text-green-400' : 'text-red-500'}>
                  {entry.verified ? '✔' : '✖'}
                </span>
              )}
              {entry.locked && (
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => copyDeepLink(idx)}
                >
                  Copy Link
                </button>
              )}
              {entry.locked && (
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => copyEntry(idx)}
                >
                  Copy
                </button>
              )}
              {!entry.locked && (
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => deleteEntry(idx)}
                >
                  Delete
                </button>
              )}
            </div>
            {entry.locked ? (
              <ReactMarkdown className="prose bg-white text-black p-2 rounded">
                {decryptedNotes[idx] || '[encrypted]'}
              </ReactMarkdown>
            ) : (
              <>
                <textarea
                  className="w-full p-1 text-black"
                  placeholder="Notes (Markdown supported)"
                  value={entry.note}
                  onChange={(e) => onNoteChange(idx, e.target.value)}
                  readOnly={entry.locked}
                />
                <ReactMarkdown className="prose bg-white text-black p-2 rounded mt-1">
                  {entry.note}
                </ReactMarkdown>
                <input
                  type="text"
                  className="w-full p-1 text-black mt-1"
                  placeholder="Artifact link (optional)"
                  value={entry.link || ''}
                  onChange={(e) => onLinkChange(idx, e.target.value)}
                />
              </>
            )}
            {entry.locked && entry.link && (
              <div className="mt-1 text-xs">
                Artifact:{' '}
                <a href={entry.link} className="text-blue-400 underline">
                  {entry.link}
                </a>
              </div>
            )}
            {entry.hash && (
              <div className="mt-1 text-xs break-all">
                <div>Hash: {entry.hash}</div>
                <div>Chain: {entry.chain}</div>
                {entry.timestamp && <div>Timestamp: {entry.timestamp}</div>}
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
          onClick={async () => {
            const ok = await verifyEntries();
            alert(ok ? 'All entries verified' : 'Verification failed');
          }}
          disabled={entries.length === 0}
        >
          Verify
        </button>
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded disabled:opacity-50"
          onClick={exportBundle}
          disabled={entries.some((e) => !e.locked)}
        >
          Export Bundle
        </button>
      </div>
    </div>
  );
};

export default EvidenceNotebook;

export const displayEvidenceNotebook = () => <EvidenceNotebook />;
