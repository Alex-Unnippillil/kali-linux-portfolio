'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { copyToClipboard } from '../../../utils/clipboard';

const PBKDF2_ITERATIONS = 120_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const STORAGE_KEY = 'crypto-toolkit:aes-gcm';

type KeyUsageOptions = ['encrypt', 'decrypt'] | ['decrypt'];

interface StoredCiphertext {
  ciphertext: string;
  salt: string;
  iv: string;
  iterations: number;
}

const isStoredCiphertext = (value: unknown): value is StoredCiphertext =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as StoredCiphertext).ciphertext === 'string' &&
      typeof (value as StoredCiphertext).salt === 'string' &&
      typeof (value as StoredCiphertext).iv === 'string' &&
      typeof (value as StoredCiphertext).iterations === 'number',
  );

const arrayBufferToBase64 = (data: ArrayBuffer | Uint8Array): string => {
  const view = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  view.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(binary);
  }

  return Buffer.from(binary, 'binary').toString('base64');
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  if (!base64) return new Uint8Array();
  let binary: string;
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    binary = window.atob(base64);
  } else {
    binary = Buffer.from(base64, 'base64').toString('binary');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  usages: KeyUsageOptions,
) {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

const loadStoredState = (): StoredCiphertext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return isStoredCiphertext(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const AesGcmDemo: React.FC = () => {
  const [plaintext, setPlaintext] = useState('');
  const [password, setPassword] = useState('');
  const [stored, setStored] = useState<StoredCiphertext | null>(null);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plaintextId = useId();
  const passwordId = useId();
  const textEncoder = useMemo(() => new TextEncoder(), []);
  const textDecoder = useMemo(() => new TextDecoder(), []);

  const cryptoAvailable =
    typeof window !== 'undefined' && typeof window.crypto?.subtle !== 'undefined';

  useEffect(() => {
    const initial = loadStoredState();
    if (initial) {
      setStored(initial);
    }
  }, []);

  const persistState = (payload: StoredCiphertext | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (payload) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  const clearMessages = () => {
    setStatus(null);
    setError(null);
  };

  const handleEncrypt = async () => {
    if (busy) return;
    clearMessages();
    setDecrypted(null);

    if (!plaintext.trim()) {
      setError('Enter plaintext to encrypt.');
      return;
    }
    if (!password) {
      setError('A password is required to derive the key.');
      return;
    }
    if (!cryptoAvailable) {
      setError('Web Crypto API is not available in this environment.');
      return;
    }

    try {
      setBusy(true);
      const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const key = await deriveKey(password, salt, PBKDF2_ITERATIONS, ['encrypt', 'decrypt']);
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        textEncoder.encode(plaintext),
      );
      const payload: StoredCiphertext = {
        ciphertext: arrayBufferToBase64(cipherBuffer),
        salt: arrayBufferToBase64(salt),
        iv: arrayBufferToBase64(iv),
        iterations: PBKDF2_ITERATIONS,
      };
      setStored(payload);
      persistState(payload);
      setStatus('Ciphertext stored for this session.');
    } catch {
      setError('Encryption failed. Ensure your browser supports AES-GCM.');
    } finally {
      setBusy(false);
    }
  };

  const handleDecrypt = async () => {
    if (busy) return;
    clearMessages();

    if (!stored) {
      setError('No ciphertext available to decrypt.');
      return;
    }
    if (!password) {
      setError('Enter the password used during encryption.');
      return;
    }
    if (!cryptoAvailable) {
      setError('Web Crypto API is not available in this environment.');
      return;
    }

    try {
      setBusy(true);
      const saltBytes = base64ToUint8Array(stored.salt);
      const ivBytes = base64ToUint8Array(stored.iv);
      const key = await deriveKey(password, saltBytes, stored.iterations, ['decrypt']);
      const cipherBytes = base64ToUint8Array(stored.ciphertext);
      const plainBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        cipherBytes,
      );
      const text = textDecoder.decode(plainBuffer);
      setDecrypted(text);
      setStatus('Decryption successful.');
    } catch {
      setError('Unable to decrypt with the provided password.');
      setDecrypted(null);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCiphertext = async () => {
    if (!stored) return;
    clearMessages();
    const copied = await copyToClipboard(stored.ciphertext);
    if (copied) {
      setStatus('Ciphertext copied to clipboard.');
    } else {
      setError('Failed to copy ciphertext to clipboard.');
    }
  };

  const handleCopyParameters = async () => {
    if (!stored) return;
    clearMessages();
    const params = JSON.stringify(
      {
        salt: stored.salt,
        iv: stored.iv,
        iterations: stored.iterations,
      },
      null,
      2,
    );
    const copied = await copyToClipboard(params);
    if (copied) {
      setStatus('Parameters copied to clipboard.');
    } else {
      setError('Failed to copy parameters to clipboard.');
    }
  };

  return (
    <div className="space-y-4 rounded-lg bg-slate-900 p-4 text-slate-100">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">AES-GCM Workbench</h2>
        <p className="text-sm text-slate-300">
          Derive a 256-bit AES-GCM key using PBKDF2, then encrypt and decrypt payloads in the
          browser. Salt, nonce, and ciphertext are preserved for this session only.
        </p>
        {!cryptoAvailable && (
          <p className="text-sm text-amber-300">
            Your browser does not expose the Web Crypto API. Encryption and decryption controls are
            disabled.
          </p>
        )}
      </header>

      <div className="space-y-1 text-sm font-medium">
        <label htmlFor={plaintextId} className="block">
          Plaintext
        </label>
        <textarea
          id={plaintextId}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white"
          rows={4}
          value={plaintext}
          onChange={(event) => setPlaintext(event.target.value)}
          placeholder="Type a message to protect"
        />
      </div>

      <div className="space-y-1 text-sm font-medium">
        <label htmlFor={passwordId} className="block">
          Password
        </label>
        <input
          id={passwordId}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-sm text-white"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Derive key with a strong passphrase"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleEncrypt}
          disabled={busy || !cryptoAvailable}
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          Encrypt &amp; store
        </button>
        <button
          type="button"
          onClick={handleDecrypt}
          disabled={busy || !cryptoAvailable || !stored}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-900"
        >
          Decrypt
        </button>
      </div>

      {status && (
        <p className="text-sm text-emerald-400" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}

      {stored && (
        <section className="space-y-3 rounded border border-slate-700 bg-slate-950 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Session payload</h3>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyCiphertext}
                className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white"
              >
                Copy ciphertext
              </button>
              <button
                type="button"
                onClick={handleCopyParameters}
                className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white"
              >
                Copy parameters
              </button>
            </div>
          </div>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-400">Ciphertext</dt>
              <dd className="break-all font-mono text-slate-200">{stored.ciphertext}</dd>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-400">Salt</dt>
                <dd className="break-all font-mono text-slate-200">{stored.salt}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-slate-400">Nonce</dt>
                <dd className="break-all font-mono text-slate-200">{stored.iv}</dd>
              </div>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-400">PBKDF2 iterations</dt>
              <dd className="font-mono text-slate-200">{stored.iterations.toLocaleString()}</dd>
            </div>
          </dl>
        </section>
      )}

      {decrypted && (
        <section className="space-y-1 rounded border border-slate-700 bg-slate-950 p-3">
          <h3 className="text-sm font-semibold">Decrypted plaintext</h3>
          <p className="whitespace-pre-wrap break-words font-mono text-xs text-slate-100">{decrypted}</p>
        </section>
      )}
    </div>
  );
};

export default AesGcmDemo;
