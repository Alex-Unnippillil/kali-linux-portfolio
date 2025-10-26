"use client";

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { get, set } from 'idb-keyval';
import { trackEvent } from '@/lib/analytics-client';
import { sshAgentMock } from '@/utils/sshAgentMock';

const STORAGE_KEY = 'ssh-manager::keys';
const COPY_TIMEOUT_MS = 2000;
const PBKDF2_ITERATIONS = 210000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

interface StoredKey {
  id: string;
  comment: string;
  createdAt: number;
  fingerprint: string;
  publicKey: string;
  encryptedPrivateKey: string;
  iv: string;
  salt: string;
  passphraseProtected: boolean;
}

interface AgentFormState {
  [keyId: string]: string;
}

const getCrypto = (): Crypto | undefined => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
    return (globalThis as any).crypto as Crypto;
  }
  try {
    // eslint-disable-next-line global-require
    const { webcrypto } = require('crypto');
    return webcrypto as unknown as Crypto;
  } catch {
    return undefined;
  }
};

const getSubtle = (): SubtleCrypto => {
  const cryptoImpl = getCrypto();
  if (!cryptoImpl?.subtle) {
    throw new Error('WebCrypto is not available in this environment');
  }
  return cryptoImpl.subtle;
};

const toBase64 = (data: ArrayBuffer | Uint8Array): string => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const bufferCtor =
    typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
  if (typeof window === 'undefined' && bufferCtor) {
    return bufferCtor.from(bytes).toString('base64');
  }
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  if (!value) return new Uint8Array();
  const bufferCtor =
    typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;
  if (typeof window === 'undefined' && bufferCtor) {
    return Uint8Array.from(bufferCtor.from(value, 'base64'));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const randomBytes = (length: number): Uint8Array => {
  const cryptoImpl = getCrypto();
  if (!cryptoImpl) {
    throw new Error('Unable to access secure random generator');
  }
  const buffer = new Uint8Array(length);
  cryptoImpl.getRandomValues(buffer);
  return buffer;
};

const deriveKey = async (passphrase: string, salt: Uint8Array) => {
  const subtle = getSubtle();
  const baseKey = await subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
};

const encryptPrivateKey = async (privateKey: string, passphrase: string) => {
  const subtle = getSubtle();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const aesKey = await deriveKey(passphrase, salt);
  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    textEncoder.encode(privateKey),
  );
  return {
    encryptedPrivateKey: toBase64(encrypted),
    salt: toBase64(salt),
    iv: toBase64(iv),
  };
};

const decryptPrivateKey = async (
  record: Pick<StoredKey, 'encryptedPrivateKey' | 'salt' | 'iv'>,
  passphrase: string,
) => {
  const subtle = getSubtle();
  const aesKey = await deriveKey(passphrase, fromBase64(record.salt));
  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(record.iv) },
    aesKey,
    fromBase64(record.encryptedPrivateKey),
  );
  return textDecoder.decode(new Uint8Array(decrypted));
};

const formatPem = (bytes: Uint8Array): string => {
  const base64 = toBase64(bytes);
  const wrapped = base64.match(/.{1,64}/g)?.join('\n') ?? base64;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
};

const createSshPublicKey = (publicKey: Uint8Array): string => {
  const type = 'ssh-ed25519';
  const typeBytes = textEncoder.encode(type);
  const buffer = new Uint8Array(4 + typeBytes.length + 4 + publicKey.length);
  const view = new DataView(buffer.buffer);
  let offset = 0;
  view.setUint32(offset, typeBytes.length, false);
  offset += 4;
  buffer.set(typeBytes, offset);
  offset += typeBytes.length;
  view.setUint32(offset, publicKey.length, false);
  offset += 4;
  buffer.set(publicKey, offset);
  return `${type} ${toBase64(buffer)}`;
};

const computeFingerprint = async (publicKey: string): Promise<string> => {
  const subtle = getSubtle();
  const base = publicKey.split(' ')[1];
  if (!base) {
    throw new Error('Invalid public key');
  }
  const digest = await subtle.digest('SHA-256', fromBase64(base));
  return `SHA256:${toBase64(digest).replace(/=+$/, '')}`;
};

const exportKeyPair = async (comment: string) => {
  const subtle = getSubtle();
  const keyPair = await subtle.generateKey(
    {
      name: 'Ed25519',
    },
    true,
    ['sign', 'verify'],
  );
  const privateKeyBytes = new Uint8Array(
    await subtle.exportKey('pkcs8', keyPair.privateKey),
  );
  const publicKeyBytes = new Uint8Array(
    await subtle.exportKey('raw', keyPair.publicKey),
  );

  const publicKey = createSshPublicKey(publicKeyBytes);
  const privateKey = formatPem(privateKeyBytes);
  const fingerprint = await computeFingerprint(publicKey);
  return { publicKey, privateKey, fingerprint };
};

const cleanPem = (value: string): string =>
  value
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');

const parsePem = (pem: string): Uint8Array => fromBase64(cleanPem(pem));

const generateId = (): string => {
  const cryptoImpl = getCrypto();
  if (cryptoImpl?.randomUUID) {
    return cryptoImpl.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const initialGenerateForm = {
  comment: '',
  passphrase: '',
};

const initialImportForm = {
  comment: '',
  passphrase: '',
  publicKey: '',
  privateKey: '',
};

const SshManager: React.FC = () => {
  const [keys, setKeys] = useState<StoredKey[]>([]);
  const [generateForm, setGenerateForm] = useState(initialGenerateForm);
  const [importForm, setImportForm] = useState(initialImportForm);
  const [agentPassphrases, setAgentPassphrases] = useState<AgentFormState>({});
  const [agentState, setAgentState] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [keyErrors, setKeyErrors] = useState<Record<string, string>>({});
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAgentState = useCallback(() => {
    const loaded = sshAgentMock.listKeys();
    setAgentState(new Set(loaded.map((item) => item.id)));
  }, []);

  const loadStoredKeys = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = await get<StoredKey[]>(STORAGE_KEY);
      setKeys(stored ?? []);
    } catch (err) {
      console.error('Failed to load SSH keys', err);
      setError('Unable to read stored keys. Try refreshing the app.');
    }
  }, []);

  useEffect(() => {
    loadStoredKeys();
    refreshAgentState();
    return () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
    };
  }, [loadStoredKeys, refreshAgentState]);

  const persistKeys = useCallback(async (next: StoredKey[]) => {
    if (typeof window === 'undefined') return;
    await set(STORAGE_KEY, next);
    setKeys(next);
  }, []);

  const handleGenerate = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setStatus(null);
      setError(null);
      try {
        const { publicKey, privateKey, fingerprint } = await exportKeyPair(
          generateForm.comment,
        );
        const passphrase = generateForm.passphrase ?? '';
        const encrypted = await encryptPrivateKey(privateKey, passphrase);
        const id = generateId();
        const record: StoredKey = {
          id,
          comment: generateForm.comment.trim(),
          createdAt: Date.now(),
          fingerprint,
          publicKey,
          passphraseProtected: passphrase.length > 0,
          ...encrypted,
        };
        await persistKeys([record, ...keys]);
        setGenerateForm(initialGenerateForm);
        setStatus('Generated a new Ed25519 key.');
      } catch (err) {
        console.error('Failed to generate key', err);
        setError('Key generation failed. Ensure WebCrypto is available.');
      }
    },
    [generateForm, keys, persistKeys],
  );

  const handleImport = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setStatus(null);
      setError(null);
      try {
        const privateKeyBytes = parsePem(importForm.privateKey);
        if (!privateKeyBytes.length) {
          throw new Error('Missing private key bytes');
        }
        await getSubtle().importKey(
          'pkcs8',
          privateKeyBytes,
          { name: 'Ed25519' },
          true,
          ['sign'],
        );
        const publicKey = importForm.publicKey.trim();
        if (!publicKey.startsWith('ssh-ed25519 ')) {
          throw new Error('Only ssh-ed25519 public keys are supported');
        }
        const fingerprint = await computeFingerprint(publicKey);
        const encrypted = await encryptPrivateKey(
          formatPem(privateKeyBytes),
          importForm.passphrase ?? '',
        );
        const record: StoredKey = {
          id: generateId(),
          comment: importForm.comment.trim(),
          createdAt: Date.now(),
          fingerprint,
          publicKey,
          passphraseProtected: (importForm.passphrase ?? '').length > 0,
          ...encrypted,
        };
        await persistKeys([record, ...keys]);
        setImportForm(initialImportForm);
        setStatus('Imported SSH key.');
      } catch (err) {
        console.error('Failed to import key', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to import the provided key.',
        );
      }
    },
    [importForm, keys, persistKeys],
  );

  const handleCopy = useCallback(
    async (key: StoredKey) => {
      setError(null);
      if (!navigator.clipboard?.writeText) {
        setError('Clipboard access is not available in this browser.');
        return;
      }
      try {
        const value = key.comment
          ? `${key.publicKey} ${key.comment}`
          : key.publicKey;
        await navigator.clipboard.writeText(value);
        setCopiedKeyId(key.id);
        trackEvent('ssh_public_key_copied', { keyId: key.id });
        if (copyTimer.current) {
          clearTimeout(copyTimer.current);
        }
        copyTimer.current = setTimeout(() => {
          setCopiedKeyId(null);
        }, COPY_TIMEOUT_MS);
      } catch (err) {
        console.error('Failed to copy SSH key', err);
        setError('Failed to copy the public key to the clipboard.');
      }
    },
    [],
  );

  const handlePassphraseChange = useCallback((id: string, value: string) => {
    setAgentPassphrases((prev) => ({ ...prev, [id]: value }));
    setKeyErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleLoad = useCallback(
    async (key: StoredKey) => {
      setError(null);
      try {
        const passphrase = agentPassphrases[key.id] ?? '';
        if (key.passphraseProtected && !passphrase) {
          setKeyErrors((prev) => ({
            ...prev,
            [key.id]: 'Enter the passphrase to load this key.',
          }));
          return;
        }
        const privateKey = await decryptPrivateKey(key, passphrase);
        await sshAgentMock.addKey(key.id, privateKey, {
          comment: key.comment,
          fingerprint: key.fingerprint,
          publicKey: key.publicKey,
        });
        setKeyErrors((prev) => {
          if (!prev[key.id]) return prev;
          const next = { ...prev };
          delete next[key.id];
          return next;
        });
        refreshAgentState();
        setStatus('Key added to the simulated SSH agent.');
      } catch (err) {
        console.error('Failed to unlock key', err);
        setKeyErrors((prev) => ({
          ...prev,
          [key.id]: 'Incorrect passphrase or corrupted key.',
        }));
      }
    },
    [agentPassphrases, refreshAgentState],
  );

  const handleRemove = useCallback(
    (id: string) => {
      sshAgentMock.removeKey(id);
      refreshAgentState();
      setStatus('Key removed from the simulated SSH agent.');
    },
    [refreshAgentState],
  );

  const hasKeys = keys.length > 0;

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-ub-cool-grey text-white"
      data-testid="ssh-manager"
    >
      <div className="space-y-3 border-b border-gray-700 p-4">
        <div>
          <h1 className="text-2xl font-semibold">SSH Key Manager</h1>
          <p className="text-sm text-gray-200">
            Generate Ed25519 key pairs, import existing keys, and load them into
            the simulated SSH agent without touching the real system.
          </p>
        </div>
        {status && <div className="text-sm text-emerald-300">{status}</div>}
        {error && <div className="text-sm text-red-300">{error}</div>}
        <form
          onSubmit={handleGenerate}
          className="space-y-2 rounded border border-gray-700 bg-gray-900 p-3"
        >
          <h2 className="text-lg font-medium">Generate a new key</h2>
          <div>
            <label
              htmlFor="ssh-generate-comment"
              className="mb-1 block text-sm font-medium"
            >
              Key comment
            </label>
            <input
              id="ssh-generate-comment"
              value={generateForm.comment}
              onChange={(event) =>
                setGenerateForm((prev) => ({
                  ...prev,
                  comment: event.target.value,
                }))
              }
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              placeholder="workstation@demo"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="ssh-generate-passphrase"
              className="mb-1 block text-sm font-medium"
            >
              Passphrase (recommended)
            </label>
            <input
              id="ssh-generate-passphrase"
              type="password"
              value={generateForm.passphrase}
              onChange={(event) =>
                setGenerateForm((prev) => ({
                  ...prev,
                  passphrase: event.target.value,
                }))
              }
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500"
          >
            Generate key
          </button>
        </form>
        <form
          onSubmit={handleImport}
          className="space-y-2 rounded border border-gray-700 bg-gray-900 p-3"
        >
          <h2 className="text-lg font-medium">Import an existing key</h2>
          <p className="text-xs text-gray-300">
            Paste an Ed25519 private key (PKCS#8 or OpenSSH) and its matching
            public key. Imported keys never leave the browser.
          </p>
          <div>
            <label
              htmlFor="ssh-import-comment"
              className="mb-1 block text-sm font-medium"
            >
              Key comment
            </label>
            <input
              id="ssh-import-comment"
              value={importForm.comment}
              onChange={(event) =>
                setImportForm((prev) => ({
                  ...prev,
                  comment: event.target.value,
                }))
              }
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              placeholder="imported-key"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="ssh-import-private"
              className="mb-1 block text-sm font-medium"
            >
              Private key
            </label>
            <textarea
              id="ssh-import-private"
              required
              value={importForm.privateKey}
              onChange={(event) =>
                setImportForm((prev) => ({
                  ...prev,
                  privateKey: event.target.value,
                }))
              }
              className="h-28 w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
          </div>
          <div>
            <label
              htmlFor="ssh-import-public"
              className="mb-1 block text-sm font-medium"
            >
              Public key
            </label>
            <textarea
              id="ssh-import-public"
              required
              value={importForm.publicKey}
              onChange={(event) =>
                setImportForm((prev) => ({
                  ...prev,
                  publicKey: event.target.value,
                }))
              }
              className="h-20 w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
              placeholder="ssh-ed25519 AAAAC... user@host"
            />
          </div>
          <div>
            <label
              htmlFor="ssh-import-passphrase"
              className="mb-1 block text-sm font-medium"
            >
              Passphrase to store with (optional)
            </label>
            <input
              id="ssh-import-passphrase"
              type="password"
              value={importForm.passphrase}
              onChange={(event) =>
                setImportForm((prev) => ({
                  ...prev,
                  passphrase: event.target.value,
                }))
              }
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
              placeholder="••••••"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500"
          >
            Import key
          </button>
        </form>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <h2 className="text-lg font-medium">Stored keys</h2>
        {!hasKeys && (
          <p className="text-sm text-gray-300">
            No keys saved yet. Generate a new key or import one to get started.
          </p>
        )}
        {keys.map((key) => {
          const isLoaded = agentState.has(key.id);
          const keyError = keyErrors[key.id];
          return (
            <div
              key={key.id}
              className="space-y-2 rounded border border-gray-700 bg-gray-900 p-3"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-semibold">
                    {key.comment || 'Unnamed key'}
                  </p>
                  <p className="text-xs text-gray-300">
                    Fingerprint: {key.fingerprint}
                  </p>
                  <p className="text-xs text-gray-400">
                    Created {new Date(key.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(key)}
                    className="rounded bg-gray-700 px-3 py-1 text-xs font-medium hover:bg-gray-600"
                  >
                    {copiedKeyId === key.id ? 'Copied!' : 'Copy public key'}
                  </button>
                  {isLoaded ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(key.id)}
                      className="rounded bg-rose-600 px-3 py-1 text-xs font-medium hover:bg-rose-500"
                    >
                      Remove from agent
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLoad(key)}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium hover:bg-emerald-500"
                    >
                      Load into agent
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded bg-black/50 p-2 font-mono text-xs text-emerald-200 break-all">
                {key.publicKey}
              </div>
              {key.passphraseProtected && (
                <div>
                  <label
                    htmlFor={`ssh-pass-${key.id}`}
                    className="mb-1 block text-xs font-medium text-gray-300"
                  >
                    Passphrase to unlock
                  </label>
                  <input
                    id={`ssh-pass-${key.id}`}
                    type="password"
                    value={agentPassphrases[key.id] ?? ''}
                    onChange={(event) =>
                      handlePassphraseChange(key.id, event.target.value)
                    }
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
                    placeholder="Enter passphrase"
                    autoComplete="current-password"
                  />
                </div>
              )}
              {keyError && (
                <div className="text-xs text-red-300">{keyError}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SshManager;
